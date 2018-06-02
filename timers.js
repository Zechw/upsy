{
  init: function(elevators, floors) {
    function floorTimerKey(floorNum, direction) {
      return 'floor' + floorNum + direction
    }
    function elevatorTimerKey(elevatorIndex, destination) {
      return 'elevator' + elevatorIndex + '_' + destination
    }
    let startFloorTimer = (floorNum, direction) => {
      if (!(floorTimerKey(floorNum, direction) in this.timers)) {
        this.timers[floorTimerKey(floorNum, direction)] = new this.Timer()
      }
    }
    let startElevatorTimer = (elevatorIndex, destination) => {
      if (!(elevatorTimerKey(elevatorIndex, destination) in this.timers)) {
        this.timers[elevatorTimerKey(elevatorIndex, destination)] = new this.Timer()
      }
    }
    for (let floor of floors) {
      floor.on('up_button_pressed', () => {
        startFloorTimer(floor.floorNum(), 'up')
      })
      floor.on('down_button_pressed', () => {
        startFloorTimer(floor.floorNum(), 'down')
      })
    }
    for (i=0; i<elevators.length; i++) {
      elevators[i].on('floor_button_pressed', (floorNum) => {
        startElevatorTimer(i, floorNum)
      })
    }
    //TODO clear timers when ariving/resolving at floors

  },
  update: function(dt, elevators, floors) {
      this.updateTimers(this.timers, dt)
      console.log(this.timers, dt)
  },
  updateTimers(timers, dt) {
    for(let key in timers) {
      let timer = timers[key]
      if (Array.isArray(timer)) {
        this.updateTimers(timer, dt)
      } else if (timer instanceof this.Timer) {
        timer.update(dt)
      } else {
        console.log('lost', timer)
      }
    }
  },
  timers: [],
  Timer: class {
    constructor() {
      this.time = 0
    }
    update(dt) {
      this.time += dt
    }
  },
}
