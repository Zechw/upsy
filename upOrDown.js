{
    init: function(elevators, floors) {
        for(let eIndex = 0; eIndex < elevators.length; eIndex++){
            let elevator = elevators[eIndex]
            let isUp = eIndex % 2 == 0
            elevator.goingUpIndicator(isUp)
            elevator.goingDownIndicator(!isUp)
            elevator.on('idle', () => this.goToBestFloor(elevator, floors, isUp))
            elevator.on('floor_button_pressed', (floorNum) => this.goToBestFloor(elevator, floors, isUp))
            for(let floor of floors){
                floor.on((isUp? 'up':'down')+'_button_pressed', () => this.goToBestFloor(elevator, floors, isUp))
            }
        }
    },
    goToBestFloor(elevator, floors, isUp) {
        let destinations = elevator.getPressedFloors()
        if(elevator.loadFactor() < .7){
            for(let floor of floors){
                if(floor.buttonStates[isUp? 'up':'down'] == 'activated') {
                    destinations.push(floor.floorNum())
                }
            }
        }
        if(destinations.length == 0) {
            destinations.push(isUp? 0 : floors.length-1) // add loby or top floor as neutral positions
        }
        destinations.sort((a,b) => isUp? a-b:b-a)
        elevator.destinationQueue = [destinations[0]]
        elevator.checkDestinationQueue()
    },
    update: function(dt, elevators, floors) {}
}
