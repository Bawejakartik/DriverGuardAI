import cv2
import requests
import time

eye_cascade = cv2.CascadeClassifier("haarcascade_eye.xml")
face_cascade = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")

capture = cv2.VideoCapture(0)

url = "http://localhost:4000/api/v8/ai/driver-event"

last_sent = time.time()

while True:

    ret, frame = capture.read()

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    faceDetected = False
    eyestatus = "closed"

    for (x, y, w, h) in faces:

        faceDetected = True

        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 5)

        roi_gray = gray[y:y+h, x:x+w]
        roi_color = frame[y:y+h, x:x+w]

        eyes = eye_cascade.detectMultiScale(roi_gray, 1.3, 5)

        if len(eyes) > 0:
            eyestatus = "open"

        for (ex, ey, ew, eh) in eyes:
            cv2.rectangle(roi_color, (ex, ey), (ex+ew, ey+eh), (0, 255, 0), 2)

    data = {
        "driverid": "driver001",
        "face_detected": faceDetected,
        "eyeStatus": eyestatus,
        "earValue": 0
    }

  
    if time.time() - last_sent > 3:
        try:
            response = requests.post(url, json=data)
            print(response.status_code)
        except:
            print("API not reachable")

        last_sent = time.time()

    cv2.imshow("Face Tracking", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

capture.release()
cv2.destroyAllWindows()