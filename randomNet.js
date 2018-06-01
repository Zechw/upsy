{
  init: async function(elevators, floors) {
    // console.log(localStorage.getItem('elevatorCrushCode_v5'))
    // doFitnessSuite(localStorage.getItem('elevatorCrushCode_v5'), 10)

    if (typeof tf == 'undefined') {
      await fetch('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@0.11.2')
        .then(response => response.text())
        .then(body => (0, eval)(body))
      console.log('TF fetched')
    }
    console.log('TensorFlow ready!', tf)

    //Upsy, your lifting friend
    //takes combination of elevatorState and floorState to give confidence of visiting floor
    const elevatorBrain = tf.sequential({
      layers: [tf.layers.dense({units: 10, inputShape: [13], activation: 'sigmoid', kernalInitializer: 'randomNormal', biasInitializer: 'randomNormal'}),
              tf.layers.dense({units: 1, kernalInitializer: 'randomNormal', biasInitializer: 'randomNormal'})
      ]
    })

    for (let elevator of elevators) {
      elevator.on("idle", () => {
        tf.tidy(() => {
          let floorWeights = floors.map((floor) => {
            let inputs = tf.tensor2d([this.getInputs(elevator, floor)])
            const result = elevatorBrain.predict(inputs)
             console.log('i', floor.floorNum(), result.dataSync())
            return result.dataSync()[0]
          })
          let floorOfMaxValue = floorWeights.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0)
          elevator.goToFloor(floorOfMaxValue)
        })
      })
      elevator.on('passing_floor', (floorNum, direction) => {
        tf.tidy(() => {
          let inputs = tf.tensor2d([this.getInputs(elevator, floors[floorNum])])
          const result = elevatorBrain.predict(inputs)
           console.log('p', floorNum, result.dataSync())
          if(result.dataSync()[0] > 0.5) {
            elevator.goToFloor(floorNum, true)
          }
        })
      })
    }
  },
  getInputs(elevator, floor) {
    let e = this.getElevatorState(elevator)
    let f = this.getFloorState(floor)
    return [
      e.currentFloor == f.floorNum ? 1:0, //is floor we're at?
      1 / (Math.abs(e.currentFloor - f.floorNum) + 1), //how close are we
      f.currentFloor == e.nextDestination ? 1:0, //is next destination floor?
      1 / (Math.abs(e.nextDestination - f.floorNum) + 1) || 0, //how close to destination
      e.destinationQueue.includes(f.floorNum)? 1:0, //is in destination queue
      e.loadFactor,
      e.goingUpIndicator? 1:0,
      e.goingDownIndicator? 1:0,
      e.destinationDirectionIsUp? 1:0,
      e.destinationDirectionIsDown? 1:0,
      e.destinationDirectionIsStopped? 1:0,
      f.buttonStateUp? 1:0,
      f.buttonStateDown? 1:0
    ]
  },
  getElevatorState(elevator) {
    return {
      currentFloor: elevator.currentFloor(),
      loadFactor: elevator.loadFactor(),
      goingUpIndicator: elevator.goingUpIndicator(),
      goingDownIndicator: elevator.goingDownIndicator(),
      destinationDirectionIsUp: elevator.destinationDirection() == 'up',
      destinationDirectionIsDown: elevator.destinationDirection() == 'down',
      destinationDirectionIsStopped: elevator.destinationDirection() == 'stopped',
      destinationQueue: elevator.destinationQueue,
      nextDestination: elevator.destinationQueue[0]
    }
  },
  getFloorState(floor) {
    return {
      floorNum: floor.floorNum(),
      buttonStateUp: floor.buttonStates.up == 'activated',
      buttonStateDown: floor.buttonStates.down == 'activated'
    }
  },
  update: function(dt, elevators, floors) {
    // console.log(tf.memory().numTensors)
  }
}
