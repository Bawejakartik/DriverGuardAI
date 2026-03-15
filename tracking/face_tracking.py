import cv2
import requests
import time

eye_cascade = cv2.CascadeClassifier("haarcascade_eye.xml")
face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")

capture = cv2.VideoCapture(0)

url = "http://localhost:4000/api/v8/ai/driver-event"

eye_closed_start = None
driver_status = "SAFE"
previous_status = "SAFE"

while True:

    ret, frame = capture.read()

    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    faceDetected = False
    eyestatus = "closed"

    for (x, y, w, h) in faces:

        faceDetected = True

        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

        roi_gray = gray[y:y+h, x:x+w]
        roi_color = frame[y:y+h, x:x+w]

        eyes = eye_cascade.detectMultiScale(
            roi_gray,
            scaleFactor=1.1,
            minNeighbors=3,
            minSize=(20,20)
        )

        if len(eyes) > 0:
            eyestatus = "open"

        for (ex, ey, ew, eh) in eyes:
            cv2.rectangle(roi_color, (ex, ey), (ex+ew, ey+eh), (0, 255, 0), 2)

    if eyestatus == "closed":

        if eye_closed_start is None:
            eye_closed_start = time.time()

        closed_time = time.time() - eye_closed_start

        if closed_time > 5:

            driver_status = "SLEEPING"

            cv2.putText(frame,"SLEEPING",(50,50),
                        cv2.FONT_HERSHEY_SIMPLEX,1,
                        (0,0,255),3)

        elif closed_time > 2:

            driver_status = "DROWSY"

            cv2.putText(frame,"DROWSY",(50,50),
                        cv2.FONT_HERSHEY_SIMPLEX,1,
                        (0,255,255),3)

        else:

            driver_status = "SAFE"

    else:

        eye_closed_start = None
        driver_status = "SAFE"

        cv2.putText(frame,"SAFE",(50,50),
                    cv2.FONT_HERSHEY_SIMPLEX,1,
                    (0,255,0),3)

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