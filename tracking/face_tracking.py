

import cv2
import mediapipe as mp
import numpy as np
import requests
import time

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

capture = cv2.VideoCapture(0)

url = "http://localhost:4000/api/v8/ai/driver-event"

eye_closed_start = None
driver_status = "SAFE"
previous_status = "SAFE"

# Eye landmark indexes
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]


def calculate_ear(eye_points):
    p1, p2, p3, p4, p5, p6 = eye_points

    # vertical distances
    v1 = np.linalg.norm(np.array(p2) - np.array(p6))
    v2 = np.linalg.norm(np.array(p3) - np.array(p5))

    # horizontal distance
    h = np.linalg.norm(np.array(p1) - np.array(p4))

    ear = (v1 + v2) / (2.0 * h)
    return ear


while True:

    ret, frame = capture.read()
    if not ret:
        break

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    eyestatus = "closed"
    faceDetected = False

    if results.multi_face_landmarks:

        faceDetected = True

        for face_landmarks in results.multi_face_landmarks:

            h, w, _ = frame.shape

            # Get eye points
            left_eye = []
            right_eye = []

            for idx in LEFT_EYE:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                left_eye.append((x, y))

            for idx in RIGHT_EYE:
                x = int(face_landmarks.landmark[idx].x * w)
                y = int(face_landmarks.landmark[idx].y * h)
                right_eye.append((x, y))

            # Calculate EAR
            left_ear = calculate_ear(left_eye)
            right_ear = calculate_ear(right_eye)

            ear = (left_ear + right_ear) / 2.0

            # Draw points (optional)
            for (x, y) in left_eye + right_eye:
                cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)

            # Threshold
            if ear > 0.25:
                eyestatus = "open"
            else:
                eyestatus = "closed"

    # 🔷 Same logic as your code
    if eyestatus == "closed":

        if eye_closed_start is None:
            eye_closed_start = time.time()

        closed_time = time.time() - eye_closed_start

        if closed_time > 5:
            driver_status = "SLEEPING"
            cv2.putText(frame, "SLEEPING", (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1,
                        (0, 0, 255), 3)

        elif closed_time > 2:
            driver_status = "DROWSY"
            cv2.putText(frame, "DROWSY", (50, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1,
                        (0, 255, 255), 3)

        else:
            driver_status = "SAFE"

    else:
        eye_closed_start = None
        driver_status = "SAFE"
        cv2.putText(frame, "SAFE", (50, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1,
                    (0, 255, 0), 3)

    # API call (same as yours)
    if driver_status != previous_status:

        data = {
            "driverid": "driver001",
            "face_detected": faceDetected,
            "eyeStatus": eyestatus,
            "driverStatus": driver_status
        }

        try:
            response = requests.post(url, json=data)
            print("Event Sent:", driver_status)
            print("Server Response:", response.status_code)

        except:
            print("Backend API not reachable")

        previous_status = driver_status

    cv2.imshow("Driver Monitoring System", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

capture.release()
cv2.destroyAllWindows()