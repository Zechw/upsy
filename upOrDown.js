{
	init: function(elevators, floors) {},
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
		destinations.sort((a,b) => (isUp != this.swap)? a-b:b-a)
		elevator.destinationQueue = [destinations[0]]
		elevator.checkDestinationQueue()
	},
	switchTime: 0,
	swap: false,
	update: function(dt, elevators, floors) {
		this.switchTime += dt
		if(elevators.length % 2 == 1 && this.switchTime > 10) {
			this.swap = !this.swap
			this.switchTime = 0
		}
		for(let eIndex = 0; eIndex < elevators.length; eIndex++){
			let elevator = elevators[eIndex]
			let isUp = eIndex % 2 == 0
			if(eIndex == elevators.length-1){
				isUp = isUp != this.swap
			}
			elevator.goingUpIndicator(isUp)
			elevator.goingDownIndicator(!isUp)
			this.goToBestFloor(elevator, floors, isUp)
		}
	}
}
