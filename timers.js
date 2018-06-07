{
  init(elevators, floors) {
		// elevators = [elevators[0]] //ez mode for moveLimits
    //register timers
		this.timers = []
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
				let key = this.floorTimerKey(currentFloor, (wasUp? 'up':'down'))
        let reTime = this.residualTime[key]
        delete this.residualTime[key]
        // console.log('residual', currentFloor, wasUp, reTime)
        this.startElevatorTimer(eNum, floorNum, reTime)
      })
      elevator.on('stopped_at_floor', (floorNum) => {
        delete this.timers[this.elevatorTimerKey(eNum, floorNum)]
				let bestFloor = this.getBestFloor(elevators, floors, eNum)
				this.setLights(elevator, bestFloor)
        if (elevator.goingUpIndicator()) {
          this.saveResidualTime(this.floorTimerKey(floorNum, 'up'))
          delete this.timers[this.floorTimerKey(floorNum, 'up')]
        }
        if (elevator.goingDownIndicator()) {
          this.saveResidualTime(this.floorTimerKey(floorNum, 'down'))
          delete this.timers[this.floorTimerKey(floorNum, 'down')]
        }
      })
    } //done registering timers

    for(let elevatorIndex = 0; elevatorIndex < elevators.length; elevatorIndex++) {
      let elevator = elevators[elevatorIndex]
      // elevator.on("idle", () => {
      //   this.goToBestFloor(elevators, floors, elevatorIndex)
      // })
			//

      // elevator.on('passing_floor', (floorNum, direction) => {
			// 	let isUp = direction == 'up'
			// 	elevator.goingUpIndicator(isUp)
      //   elevator.goingDownIndicator(!isUp)
      //   let someoneWantsUp = floors[floorNum].buttonStates.up == 'activated'
      //   let someoneWantsDown = floors[floorNum].buttonStates.down == 'activated'
      //   let someoneToPickup = (someoneWantsUp && isUp) || (someoneWantsDown && !isUp)
      //   let maxElevatorTime = 0
      //   for(let key in this.timers) {
      //     if(key.includes('elevator'+elevatorIndex+'_') && this.timers[key] > maxElevatorTime) {
      //       maxElevatorTime = this.timers[key]
      //     }
      //   }
      //   if(
      //     (someoneToPickup && elevator.loadFactor() < .7 && maxElevatorTime < 6)
      //     || elevator.getPressedFloors().includes(floorNum)
      //   ){
      //     elevator.goToFloor(floorNum, true)
      //   }
      // })


      // elevator.on('floor_button_pressed', (floorNum) => {
      //   this.goToBestFloor(elevators, floors, elevatorIndex)
      // })
    }
    for(let floor of floors) {
      floor.on('up_button_pressed', () => {this.sendStagnantElevator(floor.floorNum)})
      floor.on('down_button_pressed', () => {this.sendStagnantElevator(floor.floorNum)})
    }
  },
  update(dt, elevators, floors) {
		// elevators = [elevators[0]] //ez mode for moveLimits
    this.updateTimers(this.timers, dt)
    for(let elevatorIndex = 0; elevatorIndex < elevators.length; elevatorIndex++) {
      let elevator = elevators[elevatorIndex]
      bestFloor = this.getBestFloor(elevators, floors, elevatorIndex)
			// this.setLights(elevator, bestFloor)
      if(elevator.currentFloor() !== bestFloor
        && elevator.destinationQueue[0] !== bestFloor
      ) {
        elevator.destinationQueue = [bestFloor]
        elevator.checkDestinationQueue()
      }
    }
    console.log(this.timers, this.scoreFloors(elevators, floors))
  },
  sendStagnantElevator(floorNum, elevators){
    for(let e in elevators){
      if(e.destinationQueue.length == 0){
        e.goToFloor(floorNum)
        return
      }
    }
  },
	setLights(elevator, destination){
		// elevator.goingUpIndicator(true)
		// elevator.goingDownIndicator(true)
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
	},
  goToBestFloor(elevators, floors, elevatorIndex) {
    bestFloor = this.getBestFloor(elevators, floors, elevatorIndex)
    this.setLights(elevator, bestFloor)
    elevator.goToFloor(bestFloor)
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
				let upTime = this.getFloorTime(floor.floorNum(), 'up')
				upTime *= (elevator.destinationDirection == 'up')? 1:0.8
				let downTime = this.getFloorTime(floor.floorNum(), 'down')
				downTime *= (elevator.destinationDirection == 'down')? 1:0.8
        let pickupValue = Math.max(upTime, downTime)
				// pickupValue = upTime? 1:0 + downTime? 1:0 // override for max transportedPerSec
        let dropoffValue = this.getElevatorTime(elevatorIndex, floor.floorNum())

				//distribute bias to space out elevator pickupPreference (everyOther)
				if(elevatorIndex == floor.floorNum() % elevators.length){
          pickupValue *= 1.2
          pickupValue += 0.1
        }
				// spread evevators vertically
				if(floor.floorNum() == Math.round(elevatorIndex*(floors.length/elevators.length))){
					pickupValue *= 1.2
					pickupValue += 0.1
				}

        //discount floor if someone is already on the way
        //TODO factor in elevator's direction
        for(let e of elevators){
          if(e.destinationQueue.includes(floor.floorNum()) && e !== elevator){
            pickupValue *= 0.7
          }
        }

        let floorScore = (1*(1-load))*pickupValue + load*dropoffValue

				//value closer floors
				// floorScore *= 1 / (Math.abs(elevator.currentFloor() - floor.floorNum()) + 1)

        floorScores.push(floorScore)
      }
			//TODO leaky neighbors
			for(let i = 0; i < floorScores.length; i++){

			}
      // console.log('elevator', elevatorIndex, elevator.loadFactor(),
      //         'score', floorScores, 'max', floorScores.indexOf(Math.max(...floorScores)))
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
    let key = this.floorTimerKey(floorNum, direction)
    return (key in this.timers)? this.timers[key].time : 0
  },
  getElevatorTime(elevatorIndex, direction) {
    let key = this.elevatorTimerKey(elevatorIndex, direction)
    return (key in this.timers)? this.timers[key].time : 0
  },
  residualTime: [],
  saveResidualTime(key) {
    let existingTime = this.residualTime[key] || 0
    this.residualTime[key] = existingTime + ((key in this.timers)? this.timers[key].time : 0)
  },
  floorTimerKey(floorNum, direction) {
    return 'floor' + floorNum + direction
  },
  elevatorTimerKey(elevatorIndex, destination) {
    return 'elevator' + elevatorIndex + '_' + destination
  }
}
