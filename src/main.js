import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let world, ball, ballBody;
let ground, groundBody;
let pillars = [];
let jumpPower = 7;
let canJump = true;
let ballLane = 0; // The x-axis lane the ball is in (fixed)
let ballRadius = 1; // Radius of the ball
const pillarSpacing = 20; // Distance between pillar pairs
const pillarGap = 8; // Vertical space between upper and lower pillars
const pillarWidth = 2;
let score = 0;
const scoreDisplay = document.createElement('div');

// Set up score display
scoreDisplay.style.position = 'absolute';
scoreDisplay.style.top = '10px';
scoreDisplay.style.left = '10px';
scoreDisplay.style.color = 'white';
scoreDisplay.style.fontSize = '24px';
scoreDisplay.textContent = `Score: ${score}`;
document.body.appendChild(scoreDisplay);

function init() {
    // Set up scene, camera, and renderer
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Set up OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(20, 10, 20);
    controls.update();

    // Set up physics world
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Earth gravity (affecting y-axis)

    // Create ground (Position it at y = 0)
    const groundShape = new CANNON.Plane();
    groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.position.y = 0; // Ground at y = 0
    world.addBody(groundBody);

    // Add ground to Three.js
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    scene.add(ground);

    // Create the ball and add it to the scene
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    scene.add(ball);

    // Set up ball physics
    const ballShape = new CANNON.Sphere(ballRadius);
    ballBody = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(ballLane, 5, 0),
        linearDamping: 0.1,
        angularDamping: 0.1,
    });
    ballBody.addShape(ballShape);
    world.addBody(ballBody);

    // Create pillar pairs
    for (let i = 0; i < 5; i++) {
        createPillarPair(i * pillarSpacing + 30);
    }

    // Event listener for jumping
    window.addEventListener('keydown', onKeyDown, false);
}

function createPillarPair(x) {
    const minPillarHeight = 10;
    const maxPillarHeight = 15;
    const totalHeight = 30;

    // Random height for the lower pillar
    const lowerPillarHeight = Math.random() * (maxPillarHeight - minPillarHeight) + minPillarHeight;

    // Upper pillar height based on the gap
    const upperPillarHeight = totalHeight - lowerPillarHeight - pillarGap;

    // Create lower pillar
    const lowerPillarGeometry = new THREE.BoxGeometry(pillarWidth, lowerPillarHeight, pillarWidth);
    const lowerPillarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const lowerPillar = new THREE.Mesh(lowerPillarGeometry, lowerPillarMaterial);
    lowerPillar.position.set(x, lowerPillarHeight / 2, 0);
    scene.add(lowerPillar);

    const lowerPillarShape = new CANNON.Box(new CANNON.Vec3(pillarWidth / 2, lowerPillarHeight / 2, pillarWidth / 2));
    const lowerPillarBody = new CANNON.Body({ mass: 0 });
    lowerPillarBody.addShape(lowerPillarShape);
    lowerPillarBody.position.set(x, lowerPillarHeight / 2, 0);
    world.addBody(lowerPillarBody);

    // Create upper pillar
    const upperPillarGeometry = new THREE.BoxGeometry(pillarWidth, upperPillarHeight, pillarWidth);
    const upperPillarMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const upperPillar = new THREE.Mesh(upperPillarGeometry, upperPillarMaterial);
    upperPillar.position.set(x, totalHeight - upperPillarHeight / 2, 0);
    scene.add(upperPillar);

    const upperPillarShape = new CANNON.Box(new CANNON.Vec3(pillarWidth / 2, upperPillarHeight / 2, pillarWidth / 2));
    const upperPillarBody = new CANNON.Body({ mass: 0 });
    upperPillarBody.addShape(upperPillarShape);
    upperPillarBody.position.set(x, totalHeight - upperPillarHeight / 2, 0);
    world.addBody(upperPillarBody);

    // Add the pair to pillars array
    pillars.push({ mesh: lowerPillar, body: lowerPillarBody });
    pillars.push({ mesh: upperPillar, body: upperPillarBody });
}

function onKeyDown(event) {
    if (event.key === " ") {
        ballBody.velocity.y = jumpPower;
        canJump = false;
    }
}

function resetGame() {
    alert(`Game Over! Your score: ${score}`);
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    ballBody.position.set(ballLane, 5, 0);
    ballBody.velocity.set(0, 0, 0);
    pillars.forEach((pillar, index) => {
        const x = (index / 2) * pillarSpacing + 30;
        pillar.mesh.position.x = x;
        pillar.body.position.x = x;
        pillar.passed = false;
    });
}

function detectCollisions() {
    pillars.forEach((pillar) => {
        // Calculate the distance between the ball's center and the pillar's center
        const distanceX = Math.abs(ball.position.x - pillar.mesh.position.x);
        const distanceY = Math.abs(ball.position.y - pillar.mesh.position.y);
        const distanceZ = Math.abs(ball.position.z - pillar.mesh.position.z);

        // Get the half dimensions of the pillar (width, height, and depth)
        const pillarHalfWidth = pillar.mesh.geometry.parameters.width / 2;
        const pillarHalfHeight = pillar.mesh.geometry.parameters.height / 2;
        const pillarHalfDepth = pillar.mesh.geometry.parameters.depth / 2;

        // Check if the ball is within the bounds of the pillar in all directions
        const overlapX = distanceX < (ballRadius + pillarHalfWidth);
        const overlapY = distanceY < (ballRadius + pillarHalfHeight);
        const overlapZ = distanceZ < (ballRadius + pillarHalfDepth);

        // If there is overlap in all three dimensions, consider it a collision
        if (overlapX && overlapY && overlapZ) {
            // A collision has occurred
            pillar.mesh.material.color.set(0xffff00); // Change pillar color to yellow
            resetGame();

            // Reset color after a short delay (500ms)
            setTimeout(() => {
                pillar.mesh.material.color.set(0xff0000); // Reset to red
            }, 500);
        }

        if (!pillar.passed && pillar.mesh.position.x + pillarWidth / 2 < ball.position.x) {
            score++;
            pillar.passed = true;
            scoreDisplay.textContent = `Score: ${score}`;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    world.step(1 / 60);

    ball.position.copy(ballBody.position)
    ballBody.position.z = 0;
    camera.position.copy(ball.position);


    if (ballBody.position.y <= 1) {
        canJump = true;
        ballBody.velocity.y = 0;
    }
    if (ballBody.position.y < 1) ballBody.position.y = 1;



    // Look slightly ahead of the ball
    const lookAtOffset = new THREE.Vector3(5, 0, 0); // Adjust x to look ahead
    camera.lookAt(ball.position.clone().add(lookAtOffset));



    // Optionally hide the ball mesh
    ball.visible = true; // Hide ball mesh so you don't see it from the inside


    pillars.forEach((pillar) => {
        pillar.mesh.position.x -= 0.1;
        pillar.body.position.x -= 0.1;

        if (pillar.mesh.position.x < -20) {
            pillar.mesh.position.x = 50;
            pillar.body.position.x = 50;
        }
    });

    detectCollisions();
    renderer.render(scene, camera);
}

init();
animate();