{
	init: function(elevators, floors) {},
	goToBestFloor(elevator, floors, isUp, eAlreadyGoing=[]) {
		let destinations = elevator.getPressedFloors()
		for(let floor of floors){
			let loadLimit = (isUp && floor.floorNum() == 0)? .1 : .6
			if(elevator.loadFactor() < loadLimit){
				if(floor.buttonStates[isUp? 'up':'down'] == 'activated' && (!eAlreadyGoing[(isUp?'u':'d')+String(floor.floorNum())] || floor.floorNum() == 0 )) {
					destinations.push(floor.floorNum())
				}
			}
		}
		if(destinations.length == 0) {
			destinations.push(0)// hangout in lobby //isUp? 0 : floors.length-1) // add loby or top floor as neutral positions
		}
		destinations.sort((a,b) => (isUp)? a-b:b-a)
		elevator.destinationQueue = [destinations[0]]
		elevator.checkDestinationQueue()
		return destinations[0]
	},
	switchTime: 0,
	swap: false,
	update: function(dt, elevators, floors) {
		this.switchTime += dt
		if(elevators.length % 2 == 1 && this.switchTime > 10) {
			this.swap = !this.swap
			this.switchTime = 0
		}
		let eAlreadyGoing = []
		for(let eIndex = 0; eIndex < elevators.length; eIndex++){
			let elevator = elevators[eIndex]
			let isUp = eIndex % 2 == 0
			if(eIndex == elevators.length-1){
				isUp = isUp != this.swap
			}
			elevator.goingUpIndicator(isUp || elevator.currentFloor() < (floors.length-1)*.3)
			elevator.goingDownIndicator(!isUp || elevator.currentFloor() > (floors.length-1)*.8)
			let d = this.goToBestFloor(elevator, floors, isUp, eAlreadyGoing)
			eAlreadyGoing[(isUp?'u':'d')+String(d)] = true
		}
	}
}
