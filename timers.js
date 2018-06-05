{
  init(elevators, floors) {
    //register timers
    for (let floor of floors) {
      floor.on('up_button_pressed', () => {
        this.startFloorTimer(floor.floorNum(), 'up')
      })
      floor.on('down_button_pressed', () => {
        this.startFloorTimer(floor.floorNum(), 'down')
      })
    }
    for (let eNum=0; eNum<elevators.length; eNum++) {
      let elevator = elevators[eNum]
      elevator.on('floor_button_pressed', (floorNum) => {
        let currentFloor = elevator.currentFloor()
        let wasUp = floorNum > currentFloor
        let reTime = this.residualTime[this.floorTimerKey(currentFloor, (wasUp? 'up':'down'))]
        // console.log('residual', currentFloor, wasUp, reTime)
        this.startElevatorTimer(eNum, floorNum, reTime)
      })
      elevator.on('stopped_at_floor', (floorNum) => {
        delete this.timers[this.elevatorTimerKey(eNum, floorNum)]
        if (elevator.goingUpIndicator() && elevator.loadFactor() < 0.7) {
          this.saveResidualTime(this.floorTimerKey(floorNum, 'up'))
          delete this.timers[this.floorTimerKey(floorNum, 'up')]
        }
        if (elevator.goingDownIndicator() && elevator.loadFactor() < 0.7) {
          this.saveResidualTime(this.floorTimerKey(floorNum, 'down'))
          delete this.timers[this.floorTimerKey(floorNum, 'down')]
        }
      })
    } //done registering timers

    for(let elevatorIndex = 0; elevatorIndex < elevators.length; elevatorIndex++) {
      let elevator = elevators[elevatorIndex]
      elevator.on("idle", () => {
        bestFloor = this.getBestFloor(elevators, floors, elevatorIndex)
        if(bestFloor > elevator.currentFloor()) {
          elevator.goingUpIndicator(true)
          elevator.goingDownIndicator(false)
        } else if (bestFloor < elevator.currentFloor()) {
          elevator.goingDownIndicator(true)
          elevator.goingUpIndicator(false)
        } else {
          elevator.goingUpIndicator(true)
          elevator.goingDownIndicator(true)
        }
        elevator.goToFloor(bestFloor)
      })

      elevator.on('passing_floor', (floorNum, direction) => {
        if(direction == 'up') {
          elevator.goingUpIndicator(true)
          elevator.goingDownIndicator(false)
        } else {
          elevator.goingDownIndicator(true)
          elevator.goingUpIndicator(false)
        }
        let someoneWantsUp = floors[floorNum].buttonStates.up == 'activated'
        let someoneWantsDown = floors[floorNum].buttonStates.down == 'activated'
        let someoneToPickup = (someoneWantsUp && direction == 'up') || (someoneWantsDown && direction == 'down')
        let maxElevatorTime = 0
        for(let key in this.timers) {
          if(key.includes('elevator'+elevatorIndex+'_') && this.timers[key] > maxElevatorTime) {
            maxElevatorTime = this.timers[key]
          }
        }
        if(
          (someoneToPickup && elevator.loadFactor() < .7 && maxElevatorTime < 6)
          || elevator.getPressedFloors().includes(floorNum)
        ){
          elevator.goToFloor(floorNum, true)
        }
      })
      elevator.on('floor_button_pressed', (floorNum) => {
        elevator.goToFloor(this.getBestFloor(elevators, floors, elevatorIndex))
      })
    }
  },
  update(dt, elevators, floors) {
      this.updateTimers(this.timers, dt)
      console.log(this.timers, this.residualTime)
  },
  determineDirection(elevator, floors) {
    floorScores = this.scoreFloors([elevator], floors)[0]
    //TODO
  },
  getBestFloor(elevators, floors, elevatorIndex) {
    let elevatorScores = this.scoreFloors(elevators, floors)[elevatorIndex]
    let desiredFloor = null
    let maxScore = 0
    for(let i=0; i < elevatorScores.length; i++) {
      score = elevatorScores[i]
      if (score > maxScore || desiredFloor == null) {
        maxScore = score
        desiredFloor = i
      }
    }
    return desiredFloor
  },
  scoreFloors(elevators, floors) {
    elevatorScores = []
    for(let elevatorIndex = 0; elevatorIndex < elevators.length; elevatorIndex++) {
      elevator = elevators[elevatorIndex]

      let floorScores = []
      let load = elevator.loadFactor()
      let pressedFloors = elevator.getPressedFloors()
      for(let floor of floors) {
        let pickupValue = this.getFloorTime(floor.floorNum(), 'up') + this.getFloorTime(floor.floorNum(), 'down')
        let dropoffValue = this.getElevatorTime(elevatorIndex, floor.floorNum())

        //distribute bias to space out elevator pickupPreference (everyOther)
        if(elevatorIndex == floor.floorNum() % elevators.length){
          pickupValue *= 1.2
        }

        //ignore floor if someone is already on the way
        for(elevator of elevators){
          if(elevator.destinationQueue.includes(floor.floorNum())){
            pickupValue = 0
          }
        }

        let floorScore = (0.7*(1-load))*pickupValue + load*dropoffValue
        floorScores.push(floorScore)
      }
      // console.log('elevator', elevatorIndex, elevator.loadFactor(),
      //         'score', floorScores, 'max', floorScores.indexOf(Math.max(...floorScores)))
      //TODO leaky neighbors
      elevatorScores.push(floorScores)
    }
    return elevatorScores
  },
  updateTimers(timers, dt) {
    for(let key in timers) {
      let timer = timers[key]
      if (Array.isArray(timer)) {
        this.updateTimers(timer, dt)
      } else if (timer instanceof this.Timer) {
        timer.update(dt)
      } else {
        console.error('lost', timer)
      }
    }
  },
  timers: [],
  Timer: class {
    constructor(initialTime=0) {
      this.time = initialTime
    }
    update(dt) {
      this.time += dt
    }
  },
  startFloorTimer(floorNum, direction) {
    if (!(this.floorTimerKey(floorNum, direction) in this.timers)) {
      this.timers[this.floorTimerKey(floorNum, direction)] = new this.Timer()
    }
  },
  startElevatorTimer(elevatorIndex, destination, initialTime = 0) {
    if (!(this.elevatorTimerKey(elevatorIndex, destination) in this.timers)) {
      t = new this.Timer(initialTime)
      this.timers[this.elevatorTimerKey(elevatorIndex, destination)] = t
    }
  },
  getFloorTime(floorNum, direction) {
    key = this.floorTimerKey(floorNum, direction)
    return (key in this.timers)? this.timers[key].time : 0
  },
  getElevatorTime(elevatorIndex, direction) {
    key = this.elevatorTimerKey(elevatorIndex, direction)
    return (key in this.timers)? this.timers[key].time : 0
  },
  residualTime: [],
  saveResidualTime(key) {
    this.residualTime[key] = (key in this.timers)? this.timers[key].time : (this.residualTime[key] || 0)
  },
  floorTimerKey(floorNum, direction) {
    return 'floor' + floorNum + direction
  },
  elevatorTimerKey(elevatorIndex, destination) {
    return 'elevator' + elevatorIndex + '_' + destination
  }
}
