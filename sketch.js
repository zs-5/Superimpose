
//     ____                  _                           _     _____ __    __  __         ____                  
//    / __/_ _____  ___ ____(_)_ _  ___  ___  ___ ___   (_)   / __(_) /_  / /_/ /  ___   / __/______ ___ _  ___ 
//   _\ \/ // / _ \/ -_) __/ /  ' \/ _ \/ _ \(_-</ -_) _     / _// / __/ / __/ _ \/ -_) / _// __/ _ `/  ' \/ -_)
//  /___/\_,_/ .__/\__/_/ /_/_/_/_/ .__/\___/___/\__/ (_)   /_/ /_/\__/  \__/_//_/\__/ /_/ /_/  \_,_/_/_/_/\__/ 
//          /_/                  /_/                  


// A cool full body game, where you have to match the poses to fit through the cutouts!



// Order:
//      I. Global Variables & Parameters
//     II. Class Definitions
//    III. Function Definitions
//     IV. p5's Functions



// I. Global Variables & Parameters

// - Parameters

let ASPECT_RATIO = 16/9;
let RES_W = 1920; // Note: This is the game's rendering resolution, not the size it will display at (since I've used some CSS to automatically scale the canvas to fit the available space)
let RES_H = RES_W / ASPECT_RATIO;

let bgMusicVolume = 0.25 // 25%
let soundEffectVolume = 0.5 // 50%

// - Global variables

let score = 0, highScore = 0;
let sounds, images; // For storing files

// Pose Detection
let detectedPoses = [];
let bodyPose;
let bodyPoseStarted = false;
let skeletalConnections;
let webcamVideo;
let webcamScaleFactor;

// Initialised with some default values (roughly my measurements, but these will get calibrated to the player's measurements)
let playerBodyInfo = {
	"nose y-value": 165,
	"nose-shoulder midpoint length": 50,
	"shoulder midpoint-hip midpoint length": 150,
	"shoulder-shoulder length": 90,
	"shoulder-elbow length": 70,
	"elbow-wrist length": 60
}

// I converted the default skeleton array (which contains indices) to one that contains key names for the parts of a pose
let skeletalConnectionsNames = [
	["nose", "left_eye"],
	["nose", "right_eye"],
	["left_eye", "left_ear"],
	["right_eye", "right_ear"],
	["left_shoulder", "right_shoulder"],
	["left_shoulder", "left_elbow"],
	["left_shoulder", "left_hip"],
	["right_shoulder", "right_elbow"],
	["right_shoulder", "right_hip"],
	["left_elbow", "left_wrist"],
	["right_elbow", "right_wrist"],
	["left_hip", "right_hip"],
	["left_hip", "left_knee"],
	["right_hip", "right_knee"],
	["left_knee", "left_ankle"],
	["right_knee", "right_ankle"]
]





// II. Class definitions

class Orb {
	constructor(text, x, y, radius, completionTotal, completionCallback, keypoint = "right_wrist") {
		this.text = text
		this.x = x
		this.y = y
		this.radius = radius
		this.completion = 0;
		this.completionTotal = completionTotal;
		this.completionCallback = completionCallback;
		this.wasCompletionCallbackCalled = false;
		this.keypoint = keypoint;
	}

	update() {
		if (detectedPoses.length === 0) return; // Ensure there is a pose detected to measure from

		// Check if the chosen keypoint is within the orb
		if (dist(this.x + 640/2, this.y + 480/2, detectedPoses[0][this.keypoint].x, detectedPoses[0][this.keypoint].y) <= this.radius/2) {

			// If it is, and completion is below the threshold, increment completion
			if (this.completion < this.completionTotal)
				this.completion += 1;

			// Otherwise if it is, and completion is above the threshold, and the function wasn't called before (to avoid calling it a million times after activating), call the callback function
			else if (!this.wasCompletionCallbackCalled) {
				this.wasCompletionCallbackCalled = true;
				this.completionCallback();
			}
		// If the keypoint isn't on the orb, gradually decrease completion, to decrease the progress indicator
		} else if (this.completion > 0) {
			this.wasCompletionCallbackCalled = false; // Reset the flag, so that the function can be called again next time (whether this before is wanted depends on the situation. In this case though, it is)
			this.completion -= 1;
		}
	}

	draw() {
		// The orb itself
		drawingContext.shadowColor = "cyan"
		drawingContext.shadowBlur = 64
		stroke(0, 128, 128)
		fill(0, 128, 128, 128)
		strokeWeight(2)
		circle(this.x, this.y, this.radius)
		
		// The circular progress indicator as the orb fills up
		noFill()
		stroke(0, 255, 255)
		strokeWeight(10)
		arc(this.x, this.y, this.radius + 15, this.radius + 15, -HALF_PI, this.wasCompletionCallbackCalled ? 1.5*PI : map(this.completion/this.completionTotal, 0, 1, 0, TWO_PI) - HALF_PI)
		drawingContext.shadowBlur = 0
		
		// The orb's text
		stroke(0)
		strokeWeight(2)
		fill(255)
		textAlign(CENTER, CENTER)
		text(this.text, this.x, this.y)
	}
}



// Scenes

class MainMenu {
	constructor() {
		this.resetPopup = false;
		this.resetDone = false;
	}

	draw() {
		// Blur the background if the reset popus are active
		if (this.resetPopup || this.resetDone)
			drawingContext.filter = "blur(8px)"
		else
			drawingContext.filter = "none"
		
		// Background image
		image(images.bgs.mainMenu, 0, 0, width, height)

		// High score
		noStroke()
		textSize(32)
		textAlign(LEFT, CENTER)
		fill(0, 96)
		rect(50, 0.55*height, textWidth(`High Score: ${highScore}`) + 100, 0.1*height, 32) // The translucent black rectangle to "hold" the high score
		fill(255, 192)
		text(`High Score: ${highScore}`, 100, 0.6*height)

		drawingContext.filter = "none"
		
		// The reset pops
		if (this.resetPopup)
			image(images.resetPopup, 0, 0, width, height)
		else if (this.resetDone)
			image(images.resetDonePopup, 0, 0, width, height)
	}

	keyPressed() {
		// If the reset popup is active
		if (this.resetPopup) {

			// If the user choose not to reset
			if (key === "n") {
				this.resetDone = false;
				this.resetPopup = false;
			}

			// If the user choose to reset
			else if (key === "y") {
				this.resetDone = true;
				setTimeout(() => this.resetDone = false, 1000);
				this.resetPopup = false;
				score = 0
				highScore = 0
			}

		// Go to onboaring/calibration if p is pressed
		} else if (key === "p") {
			scenes.transitionTo("onboarding")

		// Open the reset popup if r is pressed
		} else if (key === "r") {
			this.resetPopup = true;
		}
	}
}



class Onboarding {
	constructor() {
		this.playGameOrb = new Orb("Play", 440 - webcamVideo.width/2, 200 - webcamVideo.height/2, 120, 25, () => {playerBodyInfo = measurePlayerBodyInfo(); scenes.transitionTo("game")})
	}

	drawPlayerPose() {
		push()
			resetMatrix()
			translate(width/2 - 0.5 * webcamVideo.width * webcamScaleFactor, height/2 - 0.5 * webcamVideo.height * webcamScaleFactor)
			scale(webcamScaleFactor)
			
			// Iterate through all the poses
			for (let pose of detectedPoses) {
				
				// Draw the skeleton connections
				for (let skeletalConnection of skeletalConnections) {
					let pointA = pose.keypoints[skeletalConnection[0]];
					let pointB = pose.keypoints[skeletalConnection[1]];
					
					// Only draw a line if we have confidence in both points
					if (pointA.confidence > 0.25 && pointB.confidence > 0.25) {
						stroke(0, 128);
						strokeWeight(10);
						line(pointA.x, pointA.y, pointB.x, pointB.y);
					}
				}
				
				// Iterate through all the keypoints for each pose
				for (let keypoint of pose.keypoints) {
					
					// Only draw a circle if the keypoint's confidence is greater than 0.25
					if (keypoint.confidence > 0.25) {
						fill(255);
						strokeWeight(2)
						circle(keypoint.x, keypoint.y, 10);
					}
				}
			}
		pop()
	}

	update() {
		this.playGameOrb.update()
	}
	
	draw() {
		// Blurred and darkened webcam background (since the webcam's aspect ratio will most likely not be the same as the screen's, and hence not fill the screen)
		push()
			drawingContext.filter = "blur(64px)"
			tint(128)
			image(webcamVideo, 0, 0, width, height)
		pop()
		
		push()
			translate(width/2, height/2)
			scale(webcamScaleFactor)
			
			// Draw the webcam's video
			image(webcamVideo, -webcamVideo.width/2, -webcamVideo.height/2, webcamVideo.width, webcamVideo.height)

			// Draw the orb
			this.playGameOrb.draw()
			
			// Draw the player's pose
			this.drawPlayerPose()

			// Draw the info textbox

				// The box part
				stroke(255)
				fill(255, 96)
				rect(-webcamVideo.width/2 + 50, webcamVideo.height/4, webcamVideo.width - 100, webcamVideo.height/4 - 30, 16)
				
				// The text part
				stroke(0)
				strokeWeight(2)
				fill(255)
				textAlign(CENTER, TOP)
				textSize(18)
				text("Ensure you can fully stretch your arms upwards and sideways, and still fit within the frame (adjust your webcam/screen accordingly).\nProceed by holding your right wrist on the orb.", -webcamVideo.width/2 + 50 + 10, webcamVideo.height/4 + 10, webcamVideo.width - 120, webcamVideo.height/4 - 50)
		pop()
	}
}



class Game {
	constructor() {
		score = 0;
		this.lives = 3;
		this.speed = 0.01;
		this.margin = 35; // How much leeway they get to match the position
		this.characterThickness = 10
		this.targets = []
		this.recentlyClearedTarget;
		this.totalNumTargets = 2;
	}

	playerMatchesTargetPose() {
		if (detectedPoses.length === 0) return false; // Ensure we detected a pose
		
		// Loop over each part defined by the target, and check that the player's pose for that part has enough confidence, and is "close enough" to the target (within the margin and thickness), otherwise return false
		for (let part in this.targets[0].pose) {
			for (let axis of "xy") {
				if (detectedPoses[0][part].confidence < 0.25 || Math.abs(this.targets[0].pose[part][axis] - detectedPoses[0][part][axis]) > (this.margin + this.characterThickness)) {
					return false;
				}
			}
		}
		
		return true;
	}

	drawPlayerPose() {
		push()
			translate(width/2 - 0.5 * webcamVideo.width * webcamScaleFactor, height/2 - 0.5 * webcamVideo.height * webcamScaleFactor)
			scale(webcamScaleFactor * 0.9) // * 90%, to position pose "on the road"
			
			// Iterate through all the poses
			for (let pose of detectedPoses) {
				
				// Draw the skeleton connections
				for (let skeletalConnection of skeletalConnections) {
					let pointA = pose.keypoints[skeletalConnection[0]];
					let pointB = pose.keypoints[skeletalConnection[1]];
					
					// Only draw a line if we have confidence in both points
					if (pointA.confidence > 0.25 && pointB.confidence > 0.25) {
						stroke(0, 128);
						strokeWeight(this.characterThickness);
						line(pointA.x, pointA.y, pointB.x, pointB.y);
					}
				}
				
				// Iterate through all the keypoints for each pose
				for (let keypoint of pose.keypoints) {
					
					// Only draw a circle if the keypoint's confidence is greater than 0.25
					if (keypoint.confidence > 0.25) {
						fill(255);
						// noStroke();
						strokeWeight(2);
						circle(keypoint.x, keypoint.y, this.characterThickness);
					}
				}
			}
		pop()
	}

	generateRandomPose(attempts = 0) {
		// Ideas / Constraints:
		//	- Nose should be in the middle 25% (horizontally) of the screen, and near the height of the player's nose originally (similar y-value)
		//	- 0 deg <= midpoint-shoulder-elbow angle (inside one) <= 180 deg (basically, the elbow should be outside the body, extending upwards)
		//	- 45 deg <= shoulder-elbow-wrist angle (inside one) <= 180 deg
		//20	- All parts should be within the center 80% of the available space (the nose and shoulders don't need to be tested, since they can't reach there anyways)
		//	- Also, parts shouldn't be too close to each other (similarly, we only need to check the distance between the wrists to each other and the nose)
		//	- Generate the pose, starting from the nose (as center of head) (then shoulders and so on)
		
		let outerMargin = 0.1; // 10%, so points should be in the middle 80% of the target area
		let minX = webcamVideo.width * outerMargin
		let maxX = webcamVideo.width * (1 - outerMargin)
		let minY = webcamVideo.height * outerMargin
		let maxY = webcamVideo.height * (1 - outerMargin)
	
		// Defined here, so that we can access them outside the do...while loops
		let partAttempts, leftShoulderToElbowAngle, rightShoulderToElbowAngle, leftElbowToWristAngle, rightElbowToWristAngle
		
		// Initialised with some default values (roughly my measurements)
		let pose = {
			nose: {x: 320, y: 165},
			left_shoulder: {x: 275, y: 215},
			right_shoulder: {x: 365, y: 215},
			left_hip: {x: 295, y: 365},
			right_hip: {x: 345, y: 365},
			left_elbow: {x: 220, y: 255},
			right_elbow: {x: 420, y: 255},
			left_wrist: {x: 200, y: 200},
			right_wrist: {x: 440, y: 200}
		}

		// Failsafe: If it takes too many attempts to generate a pose, just give up and output the default pose (thankfully never executed)
		if (attempts > 100) return pose;


		// Nose

		pose.nose.x = random(0.375, 0.625) * webcamVideo.width // center 25%
		pose.nose.y = random(-25, 25) + playerBodyInfo["nose y-value"] // y-value ± 25px of player's nose height


		// Shoulders

		let shoulderAngle = random(-PI/12, PI/12) // The angle from the nose to the shoulder's midpoint with origin below (think of a unit circle, but rotated clockwise 90 deg) (also equivalently, the angle from the left to right shoulder, on a normal unit circle). From -15 to 15 degrees
		let shoulderMidpoint = {
			x: pose.nose.x + sin(shoulderAngle) * playerBodyInfo["nose-shoulder midpoint length"],
			y: pose.nose.y + cos(shoulderAngle) * playerBodyInfo["nose-shoulder midpoint length"]
		}
		
		pose.left_shoulder.x = shoulderMidpoint.x - cos(shoulderAngle) * 0.5 * playerBodyInfo["shoulder-shoulder length"]
		pose.left_shoulder.y = shoulderMidpoint.y + sin(shoulderAngle) * 0.5 * playerBodyInfo["shoulder-shoulder length"]
		
		pose.right_shoulder.x = shoulderMidpoint.x + cos(shoulderAngle) * 0.5 * playerBodyInfo["shoulder-shoulder length"]
		pose.right_shoulder.y = shoulderMidpoint.y - sin(shoulderAngle) * 0.5 * playerBodyInfo["shoulder-shoulder length"]
		

		// Hips

		let hipMidpoint = { // The hip's midpoint is really just the shoulder's midpoint, but extended further, so we can calculate it in a similar fashion
			x: pose.nose.x + sin(shoulderAngle) * (playerBodyInfo["nose-shoulder midpoint length"] + playerBodyInfo["shoulder midpoint-hip midpoint length"]),
			y: pose.nose.y + cos(shoulderAngle) * (playerBodyInfo["nose-shoulder midpoint length"] + playerBodyInfo["shoulder midpoint-hip midpoint length"])
		}
		
		pose.left_hip.x = hipMidpoint.x - cos(shoulderAngle) * 0.5 * playerBodyInfo["shoulder-shoulder length"]
		pose.left_hip.y = hipMidpoint.y + sin(shoulderAngle) * 0.5 * playerBodyInfo["shoulder-shoulder length"]
		
		pose.right_hip.x = hipMidpoint.x + cos(shoulderAngle) * 0.5 * playerBodyInfo["shoulder-shoulder length"]
		pose.right_hip.y = hipMidpoint.y - sin(shoulderAngle) * 0.5 * playerBodyInfo["shoulder-shoulder length"]

		maxY = min(maxY, pose.left_hip.y < pose.right_hip.y ? pose.left_hip.y : pose.right_hip.y) // Set maxY to be the highest hip's (lowest y's) y value if it's less than maxY. This prevents the points from generating below the hip, and hence becoming invisible.


		// Elbows

		partAttempts = 0;
		do {
			if (++partAttempts > 10) return this.generateRandomPose(attempts + 1); // If it takes too many attempts to generate this part, just give up and start from scratch
			
			leftShoulderToElbowAngle = random(PI/2, 3 * PI/2) + shoulderAngle // From 90 to 270 (-90) degrees on a normal unit circle (basically 0 to 180 degrees, with the left half of a circle (imagine the unit circle rotated anticlockwise 90 deg))
			
			pose.left_elbow.x = pose.left_shoulder.x + cos(leftShoulderToElbowAngle) * playerBodyInfo["shoulder-elbow length"]
			pose.left_elbow.y = pose.left_shoulder.y - sin(leftShoulderToElbowAngle) * playerBodyInfo["shoulder-elbow length"]
			
		} while (
			minX > pose.left_elbow.x || pose.left_elbow.x > maxX || // Check if it's within the acceptable horizontal range
			minY > pose.left_elbow.y || pose.left_elbow.y > maxY // Check if it's within the acceptable verticle range
		);
		
		partAttempts = 0;
		do {
			if (++partAttempts > 10) return this.generateRandomPose(attempts + 1); // If it takes too many attempts to generate this part, just give up and start from scratch
			
			rightShoulderToElbowAngle = random(-PI/2, PI/2) + shoulderAngle // From 270 (-90) to 90 degrees on a normal unit circle (basically 0 to 180 degrees, with the right half of a circle)
			
			pose.right_elbow.x = pose.right_shoulder.x + cos(rightShoulderToElbowAngle) * playerBodyInfo["shoulder-elbow length"]
			pose.right_elbow.y = pose.right_shoulder.y - sin(rightShoulderToElbowAngle) * playerBodyInfo["shoulder-elbow length"]
		
		} while (
			minX > pose.right_elbow.x || pose.right_elbow.x > maxX || // Check if it's within the acceptable horizontal range
			minY > pose.right_elbow.y || pose.right_elbow.y > maxY // Check if it's within the acceptable verticle range
		);


		// Wrists

		partAttempts = 0;
		do {
			if (++partAttempts > 10) return this.generateRandomPose(attempts + 1); // If it takes too many attempts to generate this part, just give up and start from scratch
			
			leftElbowToWristAngle = random(1.25*PI, 2*PI) + leftShoulderToElbowAngle // random(PI/4, PI) // From 45 to 180 degrees on a normal unit circle. Will be rotated to account for the elbow's existing rotation 
		
			pose.left_wrist.x = pose.left_elbow.x + cos(leftElbowToWristAngle) * playerBodyInfo["elbow-wrist length"]
			pose.left_wrist.y = pose.left_elbow.y - sin(leftElbowToWristAngle) * playerBodyInfo["elbow-wrist length"]

		} while (
			minX > pose.left_wrist.x || pose.left_wrist.x > maxX || // Check if it's within the acceptable horizontal range
			minY > pose.left_wrist.y || pose.left_wrist.y > maxY || // Check if it's within the acceptable verticle range
			dist(pose.nose.x, pose.nose.y, pose.left_wrist.x, pose.left_wrist.y) < 50 // Check if the wrist is too close to the nose
		);

		partAttempts = 0;
		do {
			if (++partAttempts > 10) return this.generateRandomPose(attempts + 1); // If it takes too many attempts to generate this part, just give up and start from scratch
			
			rightElbowToWristAngle = random(0, 3/4 * PI) + rightShoulderToElbowAngle // From 270 (-90) to 90 degrees on a normal unit circle (basically 0 to 180 degrees, with the right half of a circle)
		
			pose.right_wrist.x = pose.right_elbow.x + cos(rightElbowToWristAngle) * playerBodyInfo["elbow-wrist length"]
			pose.right_wrist.y = pose.right_elbow.y - sin(rightElbowToWristAngle) * playerBodyInfo["elbow-wrist length"]

		} while (
			minX > pose.right_wrist.x || pose.right_wrist.x > maxX || // Check if it's within the acceptable horizontal range
			minY > pose.right_wrist.y || pose.right_wrist.y > maxY || // Check if it's within the acceptable verticle range
			dist(pose.nose.x, pose.nose.y, pose.right_wrist.x, pose.right_wrist.y) < 50 || // Check if the wrist is too close to the nose
			dist(pose.left_wrist.x, pose.left_wrist.y, pose.right_wrist.x, pose.right_wrist.y) < 50 // Check if the wrist is too close to the other wrist
		);

		return pose;
	}

	createTarget() {
		let pose = this.generateRandomPose()

		let targetLayer = createGraphics(webcamVideo.width, webcamVideo.height)

		// Background (the wall/bush)
		targetLayer.fill("lightgray")
		targetLayer.noStroke()
		targetLayer.rect(0.1*targetLayer.width, 0, 0.8*targetLayer.width, targetLayer.height, 32)


		// Pose outline

			// Outline the skeletal connections (lines between keypoints)
			for (let connection of skeletalConnectionsNames) {
				if (!(connection[0] in pose) || !(connection[1] in pose)) continue;

				let pointA = pose[connection[0]];
				let pointB = pose[connection[1]];
				
				targetLayer.stroke(0)
				targetLayer.strokeWeight(this.margin + this.characterThickness + 25);
				targetLayer.line(pointA.x, pointA.y, pointB.x, pointB.y);
			}
			
			// Outline circles at keypoints
			for (let partKey in pose) {
				let part = pose[partKey]

				targetLayer.strokeWeight(5);
				targetLayer.fill(0)
				targetLayer.circle(part.x, part.y, (partKey === "nose" ? 2.5 : 1) * this.characterThickness + this.margin + 25) // Increase 
			}

		// Pose cutout
		targetLayer.erase()

			// Cutout the skeletal connections (lines between keypoints)
			for (let connection of skeletalConnectionsNames) {
				if (!(connection[0] in pose) || !(connection[1] in pose)) continue;

				let pointA = pose[connection[0]];
				let pointB = pose[connection[1]];
				
				targetLayer.stroke(0) // Not for colour, but rather needed to re-enable stroke (since I used noStroke() earlier)
				targetLayer.strokeWeight(this.margin + this.characterThickness);
				targetLayer.line(pointA.x, pointA.y, pointB.x, pointB.y);
			}
			
			// Cutout circles at keypoints
			for (let partKey in pose) {
				let part = pose[partKey]

				targetLayer.strokeWeight(5)
				targetLayer.circle(part.x, part.y, (partKey === "nose" ? 2.5 : 1) * this.characterThickness + this.margin)
			}

			// Cutout torso
			targetLayer.quad(
				pose.left_shoulder.x, pose.left_shoulder.y,
				pose.right_shoulder.x, pose.right_shoulder.y,
				pose.right_hip.x, pose.right_hip.y,
				pose.left_hip.x, pose.left_hip.y
			)

			// Crop edges
			targetLayer.noStroke()
			targetLayer.fill(0) // Again, colour doesn't matter. It's just to re-enable the fill (though this time, only as a fail-safe)
			// graphics.rect(0.2*graphics.width, 0.6*graphics.height, 0.6*graphics.width, 10*graphics.height, 32)
			targetLayer.rect(0.2*targetLayer.width, (pose.left_hip.y < pose.right_hip.y ? pose.left_hip.y : pose.right_hip.y), 0.6*targetLayer.width, 10*targetLayer.height, 32)

		targetLayer.noErase()

		this.targets.push({
			pose: pose,
			image: targetLayer,
			distance: 100,
			poseMatches: false
		})
	}

	update() {
		// Increase speed (to increase difficulty)
		this.speed += 0.00005 // this number may seem very, very small, but it adds up, very, very quickly

		// Add target if under limit and there's enough space
		if (this.targets.length === 0 || this.targets.length < this.totalNumTargets && this.targets.at(-1).distance < 100 - 100/this.totalNumTargets)
			this.createTarget();

		// Bring the targets closer, according to the speed
		this.targets.forEach(target => target.distance -= this.speed);
		
		// Check whether the player's pose matches the first target
		
		this.targets[0].poseMatches = this.playerMatchesTargetPose()

		if (this.targets[0].poseMatches) {
			if (this.targets[0].distance < 0) {
				score++;
				this.recentlyClearedTarget = this.targets.splice(0, 1)[0] // Remove the target from the array
				this.recentlyClearedTarget.clearedAt = frameCount;
				sounds.pointScored.play(0, 1, soundEffectVolume)
			}

		// Remove missed targets and penalise the player
		} else if (this.targets[0].distance < -5) {
			if (this.lives > 1) {
				// Lose live
				this.lives--;
				this.recentlyClearedTarget = this.targets.splice(0, 1)[0] // Remove the target from the array
				this.recentlyClearedTarget.clearedAt = frameCount;
				sounds.liveLost.play(0, 1, soundEffectVolume)
			} else {
				// Game over
				if (score > highScore) highScore = score
				sounds.gameOver.play(0, 1, soundEffectVolume)
				scenes.transitionTo("mainMenu")
			}
		}
	}

	draw() {
		// Draw the background

			// Sky
			background('lightblue')
			image(images.bgs.sky, 0, 0, width, width * images.bgs.sky.height/images.bgs.sky.width)

			// Grass?
			noStroke()
			fill("#818a09")
			rect(0, height/2, width, height/2)

			// Path / road
			// fill("#a06847")
			fill("#ae4d4b")
			triangle(100, height, width-100, height, width/2, height/2)

		// Draw the scaled elements (background, targets, etc) (ones that appear to come closer to the screen)

			// Draw the targets
			push()
				// translate(width/2 - 0.5 * webcamVideo.width * webcamScaleFactor, height/2 - 0.5 * webcamVideo.height * webcamScaleFactor)
				// scale(webcamScaleFactor)
				translate(width/2, height/2)
				
				// Draw each of the targets (reversed, as we need to draw them back to front)
				this.targets.toReversed().forEach(target => {
					push()
						scale(
							// map(target.distance, 100, 0, 0, 1)
							// (1 - Math.sqrt(1 - min((1-target.distance/100)**1, 1))) // Easing function modified from easings.net
							(1 - target.distance/100)**3
							* webcamScaleFactor * 0.9
						)
						
						if (this.playerMatchesTargetPose() && this.targets[0] == target)
							tint(0, 196, 0, map(target.distance, 0, -5, 255, 0, true))
						else
							tint(196, 0, 0, map(target.distance, 0, -5, 255, 0, true))

						image(target.image, -target.image.width/2, -target.image.height/2)
					pop()
				})
			pop()

		// Draw the player's pose

		this.drawPlayerPose()

		// Draw the UI / HUD
		
			// Score & Lives

			noStroke()
			fill(0, 128)
			rect(50, 50, 250, 200, 32)
		
			stroke(0)
			strokeWeight(2)
			fill(255)
			textSize(48)
			textAlign(LEFT, CENTER)
			text("Score: " + score, 75, 100)
			text("Lives: " + this.lives, 75, 175)

			// Upcoming Pose

			push()
				translate(width - webcamVideo.width/2 - 50, 50)
				noStroke()

				if (frameCount - (this.recentlyClearedTarget?.clearedAt ?? -10) < 10) {
					if (this.recentlyClearedTarget.poseMatches) fill(lerpColor(color(0, 255, 0, 128), color(0, 128), (frameCount - this.recentlyClearedTarget.clearedAt)/10))
					else fill(lerpColor(color(255, 0, 0, 128), color(0, 128), (frameCount - this.recentlyClearedTarget.clearedAt)/10))
				} else fill(0, 128)

				rect(-100, 0, webcamVideo.width/2 + 100, webcamVideo.height/2 + 100 + 50, 32)
				
				fill(255)
				textAlign(CENTER, CENTER)
				textSize(48)
				text("Upcoming Pose", -100, 0, webcamVideo.width/2 + 100, 100)
				
				translate(-100/2, 100)

				if (this.targets.length > 0) {
					push()
						if (this.playerMatchesTargetPose())
							tint(0, 196, 0, map(this.targets[0].distance, 10, 0, 255, 0, true))
						else
							tint(196, 0, 0, map(this.targets[0].distance, 10, 0, 255, 0, true))

						image(this.targets[0].image, 0, 0, webcamVideo.width/2, webcamVideo.height/2)
					pop()
				}


				// Mini player pose

				scale(0.5)
				
				// Iterate through all the poses
				for (let pose of detectedPoses) {
					
					// Draw the skeleton connections
					for (let skeletalConnection of skeletalConnections) {
						let pointA = pose.keypoints[skeletalConnection[0]];
						let pointB = pose.keypoints[skeletalConnection[1]];
						
						// Only draw a line if we have confidence in both points
						if (pointA.confidence > 0.25 && pointB.confidence > 0.25) {
							stroke(0);
							strokeWeight(this.characterThickness*1 + 1);
							line(pointA.x, pointA.y, pointB.x, pointB.y);
							stroke(255);
							strokeWeight(this.characterThickness*1 - 1);
							line(pointA.x, pointA.y, pointB.x, pointB.y);
						}
					}
					
					// Iterate through all the keypoints for each pose
					for (let keypoint of pose.keypoints) {
						
						// Only draw a circle if the keypoint's confidence is greater than 0.25
						if (keypoint.confidence > 0.25) {
							fill(255);
							stroke(0)
							strokeWeight(2);
							circle(keypoint.x, keypoint.y, this.characterThickness*1);
						}
					}
				}
			pop()
	}
}



class Transition {
	constructor(scene1Name, scene2Name, style = "slash", instantiateNewScene = true) {
		if (instantiateNewScene) scenes[scene2Name] = new scenes.classes[scene2Name](); // Interestingly, since these classes don't take any arguments, the parenthesis is optional, but we should still include it for convention.
																									
		this.scene1Name = scene1Name
		this.scene1 = scenes[scene1Name]
		this.scene2Name = scene2Name
		this.scene2 = scenes[scene2Name]
		this.style = style
		this.currentFrameIndex = 0

		this.totalFrames = (
			style in images.transitions // For any image based ones
			? images.transitions[style].overlays?.length ?? images.transitions[style].masks?.length ?? 0 // Returns length of overlays, if it exists, otherwise length of masks, if it exists, otherwise 0
			: -1 // style === "..." and so on, for coded/manually defined ones
			)

		sounds.transitions[this.style].play(0, 1, soundEffectVolume) // Play transition sound effect
	}

	update() {
		if (frameCount % images.transitions[this.style].drawEveryNthFrame === 0) this.currentFrameIndex++;
		if (this.currentFrameIndex >= this.totalFrames - 1) scenes.switchTo(this.scene2Name)
	}
	
	draw() {
		// For any image based ones
		if (this.style in images.transitions) {
			this.scene1.draw()

			// If there are masks, draw the 1st scene with the mask applied, over the 2nd scene
			if (images.transitions[this.style].masks) {
				let scene1Image = get();
				scene1Image.mask(images.transitions[this.style].masks[this.currentFrameIndex])	
				this.scene2.draw()
				image(scene1Image, 0, 0)
			}
			
			// If there are overlays, draw them (on top)
			if (images.transitions[this.style].overlays) {
				image(images.transitions[this.style].overlays[this.currentFrameIndex], 0, 0, width, height)
			}
		}
	}
}



// Scenes
let scenes = {
	mainMenu: null,
	onboarding: null,
	game: null,
	transition: null,
	current: undefined,
	currentName: undefined,
	// ^ scenes above | helpers below v
	classes: {
		mainMenu: MainMenu,
		onboarding: Onboarding,
		game: Game,
		transition: Transition
	},
	switchTo: function(sceneName, instantiateScene = false) {
		if (instantiateScene) this[sceneName] = new this.classes[sceneName]();
		this.current = this[sceneName];
		this.currentName = sceneName;
	},
	transitionTo: function(sceneName, style, instantiateNewScene) { // No default args specified here, as they already are in the Transition class
		this.current = this.transition = new Transition(this.currentName, sceneName, style, instantiateNewScene);
		this.currentName = "transition";
	}
}





// III. Function definitions

function measurePlayerBodyInfo() {

	if (detectedPoses.length === 0) return;

	let newPlayerBodyInfo = {};

	newPlayerBodyInfo["nose y-value"] = detectedPoses[0].nose.y
	newPlayerBodyInfo["shoulder-shoulder length"] = dist(detectedPoses[0].left_shoulder.x, detectedPoses[0].left_shoulder.y, detectedPoses[0].right_shoulder.x, detectedPoses[0].right_shoulder.y)

	let shoulderMidpoint = {
		x: (detectedPoses[0].left_shoulder.x + detectedPoses[0].right_shoulder.x)/2,
		y: (detectedPoses[0].left_shoulder.y + detectedPoses[0].right_shoulder.y)/2
	}

	newPlayerBodyInfo["nose-shoulder midpoint length"] = dist(detectedPoses[0].nose.x, detectedPoses[0].nose.y, shoulderMidpoint.x, shoulderMidpoint.y)

	let hipMidpoint = {
		x: (detectedPoses[0].left_hip.x + detectedPoses[0].right_hip.x)/2,
		y: (detectedPoses[0].left_hip.y + detectedPoses[0].right_hip.y)/2
	}

	newPlayerBodyInfo["shoulder midpoint-hip midpoint length"] = dist(shoulderMidpoint.x, shoulderMidpoint.y, hipMidpoint.x, hipMidpoint.y)

	let leftShoulderToElbowLength = dist(detectedPoses[0].left_shoulder.x, detectedPoses[0].left_shoulder.y, detectedPoses[0].left_elbow.x, detectedPoses[0].left_elbow.y)
	let rightShoulderToElbowLength = dist(detectedPoses[0].right_shoulder.x, detectedPoses[0].right_shoulder.y, detectedPoses[0].right_elbow.x, detectedPoses[0].right_elbow.y)

	newPlayerBodyInfo["shoulder-elbow length"] = (leftShoulderToElbowLength + rightShoulderToElbowLength)/2

	let leftElbowToWristLength = dist(detectedPoses[0].left_elbow.x, detectedPoses[0].left_elbow.y, detectedPoses[0].left_wrist.x, detectedPoses[0].left_wrist.y)
	let rightElbowToWristLength = dist(detectedPoses[0].right_elbow.x, detectedPoses[0].right_elbow.y, detectedPoses[0].right_wrist.x, detectedPoses[0].right_wrist.y)

	newPlayerBodyInfo["elbow-wrist length"] = (leftElbowToWristLength + rightElbowToWristLength)/2

	return newPlayerBodyInfo;
}





// IV. p5's functions

function preload() {

	// Load the bodyPose model
	bodyPose = ml5.bodyPose({
		modelType: "SINGLEPOSE_THUNDER", // Singlepose (instead of multipose) to only track 1 person, and thunder (instead of lightning) for higher accuracy
		enableSmoothing: true,
		flipped: true
	});

	sounds = {
		bgs : {
			// mainMenu: loadSound(location.href + "/assets/sounds/bgs/main menu.mp3"),
			// onboarding: loadSound(location.href + "/assets/sounds/bgs/onboarding.mp3"),
			// game: loadSound(location.href + "/assets/sounds/bgs/game.mp3"),
		},
		transitions: {
			slash: loadSound(location.href + "/assets/sounds/transitions/slash.mp3")
		},
		pointScored: loadSound(location.href + "/assets/sounds/point scored.mp3"),
		liveLost: loadSound(location.href + "/assets/sounds/live lost.mp3"),
		gameOver: loadSound(location.href + "/assets/sounds/game over.mp3")
	}

	images = {
		bgs: {
			mainMenu: loadImage(location.href + "/assets/images/bgs/mainMenu.jpg"),
			sky: loadImage(location.href + "/assets/images/bgs/sky.png")
		},
		transitions: {
			slash: {
				masks: [], // Will be loaded in loop
				drawEveryNthFrame: 1,
			}
		},
		resetPopup: loadImage(location.href + "/assets/images/resetPopup.png"),
		resetDonePopup: loadImage(location.href + "/assets/images/resetDonePopup.png")
		// health (lives), score, poses (for calibration / onboarding), etc
	}

	for (let i = 1; i <= 17; i++) {
		images.transitions.slash.masks.push(loadImage(location.href + `/assets/images/transitions/slash/${i}.png`))
	}
}



function setup() {
	createCanvas(RES_W, RES_H);
	
	// Create the webcamVideo and hide it
	webcamVideo = createCapture(VIDEO, {flipped: true});
	webcamVideo.size(640, 480);
	webcamVideo.hide();

	// Set webcamScaleFactor based on the screen and webcam's aspect ratios
	if (ASPECT_RATIO > webcamVideo.width / webcamVideo.height)
		webcamScaleFactor = height / webcamVideo.height;
	else
		webcamScaleFactor = width / webcamVideo.width;
	
	// Start detecting poses in the webcam webcamVideo
	bodyPose.detectStart(webcamVideo, results => detectedPoses = results);
	
	// Get the skeleton connection information
	skeletalConnections = bodyPose.getSkeleton();

	// Start the main menu
	scenes.switchTo("mainMenu", true);
}



function draw() {
	if (bodyPoseStarted) {
		scenes.current.update?.();
		scenes.current.draw?.();
	} else if (detectedPoses.length > 0) {
			bodyPoseStarted = true;
			// Disable loading element
			let loadingElement = document.getElementById("loading-element")
			loadingElement.style.opacity = 0;
			loadingElement.style.transform = `translateY(${-RES_H}px)`;
			setTimeout(() => loadingElement.style.display = "none", 5000);
	} else {
		document.getElementById("loading-text").innerHTML = "Waiting for pose detection to start...<p style='font-size: 0.5em'>(this may freeze the browser and take a while... :/<br>please be patient and ensure the camera is enabled.)</p>";
	}
}



function keyPressed() {
	if (key === "f")
		fullscreen(!fullscreen()) // Toggle fullscreen
	// else if (key === "d")
	// 	bodyPose.detecting ? bodyPose.detectStop() : bodyPose.detectStart(webcamVideo, results => detectedPoses = results); // DEBUG
	else
		scenes.current.keyPressed?.() // Run keyPressed method of current scene, if it exists
}
