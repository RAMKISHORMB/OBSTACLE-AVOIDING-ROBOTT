# Robotics Simulation & Kinematics Engine

## 1. Differential Drive Kinematic Modeling
The simulated mobile robot features two active drive wheels on a shared lateral axis and a passive caster wheel for 3-point static stability.

### Inverse Kinematics
Given target linear body velocity $v$ and yaw rate $\omega$, the required tangential wheel speeds $v_L$ and $v_R$ are:
$$v_L = v - \frac{\omega \cdot L}{2}$$
$$v_R = v + \frac{\omega \cdot L}{2}$$
Where:
- $L = 0.16\text{ m}$ is the track width (wheelbase distance).
- $r = 0.0325\text{ m}$ is the wheel radius.

### Wheel Speed to Motor RPM & PWM
$$RPM_i = \frac{v_i}{2 \pi r} \times 60$$
$$PWM_i = \text{clamp}\left(PWM_{\min} + (255 - PWM_{\min}) \cdot \frac{|RPM_i|}{RPM_{\max}}, 0, 255\right)$$
Where $PWM_{\min} = 50$ represents motor armature stall torque deadband.

---

## 2. Geometric Raycasting & Acoustic Cone
The virtual ultrasonic transducer simulates physical sound propagation of an HC-SR04 module.

### Ray-Segment Intersection
A line segment from ray origin $P_1$ to end $P_2$ intersecting an obstacle segment $Q_1$ to $Q_2$:
$$P(t) = P_1 + t (P_2 - P_1), \quad t \in [0, 1]$$
$$Q(u) = Q_1 + u (Q_2 - Q_1), \quad u \in [0, 1]$$
Solving the linear 2D system:
$$t = \frac{(Q_{1x} - P_{1x}) Q_{y}' - (Q_{1y} - P_{1y}) Q_{x}'}{P_{x}' Q_{y}' - P_{y}' Q_{x}'}$$
Where $P' = P_2 - P_1$ and $Q' = Q_2 - Q_1$.

### Conical Dispersion
To model the acoustic specular dispersion of sound waves, the raycaster projects 7 divergent rays across a $15^\circ$ fan ($[-7.5^\circ, +7.5^\circ]$). The minimum distance hit determines the detected obstacle boundary.

---

## 3. Collision Prevention & Elastic Boundary
To ensure the robot does not clip through or enter obstacles:
- The robot is modeled as a circular bounding volume with radius $R_{\text{robot}} = 24\text{ px}$ ($12\text{ cm}$).
- At each integration step $\Delta t$, the Euclidean distance from the robot center $(x, y)$ to the nearest point on each obstacle's Axis-Aligned Bounding Box (AABB) is computed.
- If $d < R_{\text{robot}}$, the step is reverted to prevent clipping, and an emergency stop or reverse trigger is invoked.
