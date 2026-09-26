# import cv2
# import mediapipe as mp
# import numpy as np
# from flask import Flask, Response
# from flask_socketio import SocketIO
# import time
# import winsound
# import requests
# from collections import deque


# # ============================================================
# # CONFIGURATION
# # ============================================================

# # -------------------- Eye Detection --------------------

# # EAR below this value starts eye-closure detection.
# EAR_CLOSED_THRESHOLD = 0.20

# # EAR must rise above this value to consider the eyes recovered.
# # Using a different recovery threshold prevents state flickering.
# EAR_RECOVERY_THRESHOLD = 0.23

# # Number of consecutive frames below the threshold before
# # considering the eyes actually closed.
# MIN_CLOSED_FRAMES = 5

# # Number of EAR samples used for moving-average smoothing.
# EAR_SMOOTHING_WINDOW = 5

# # Eye closure duration after which we classify the driver
# # as drowsy.
# DROWSY_EYE_CLOSED_DURATION = 1.5


# # -------------------- Existing thresholds --------------------

# MAR_THRESHOLD = 0.60

# HEAD_THRESHOLD = 0.005

# # These are kept for now because yawning/head detection
# # will be improved in later steps.
# EYE_FRAMES = 15
# YAWN_FRAMES = 10


# # -------------------- Alert --------------------

# ALERT_COOLDOWN = 5.0


# # ============================================================
# # EAR SMOOTHING
# # ============================================================

# ear_history = deque(maxlen=EAR_SMOOTHING_WINDOW)


# def smooth_ear(current_ear):
#     """
#     Smooth EAR using a moving average.

#     This reduces small frame-to-frame variations caused by
#     facial landmark noise.
#     """

#     ear_history.append(current_ear)

#     return sum(ear_history) / len(ear_history)


# # ============================================================
# # FLASK / SOCKET.IO
# # ============================================================

# app = Flask(__name__)

# socketio = SocketIO(
#     app,
#     cors_allowed_origins="*",
#     async_mode="threading"
# )


# # ============================================================
# # NODE.JS BACKEND
# # ============================================================

# NODE_API_URL = (
#     "http://localhost:4000/api/v8/ai/driver-event"
# )


# # ============================================================
# # MEDIAPIPE
# # ============================================================

# mp_face_mesh = mp.solutions.face_mesh

# face_mesh = mp_face_mesh.FaceMesh(
#     refine_landmarks=True
# )

# drawing_utils = mp.solutions.drawing_utils


# # ============================================================
# # FACIAL LANDMARKS
# # ============================================================

# LEFT_EYE = [
#     362,
#     385,
#     387,
#     263,
#     373,
#     380
# ]

# RIGHT_EYE = [
#     33,
#     160,
#     158,
#     133,
#     153,
#     144
# ]

# MOUTH = [
#     78,
#     81,
#     13,
#     308,
#     14,
#     178
# ]


# # ============================================================
# # STATE
# # ============================================================

# eye_counter = 0
# yawn_counter = 0

# pitch_history = []

# output_frame = None

# last_alert_time = 0

# last_persisted_status = None


# # ============================================================
# # NEW EYE STATE VARIABLES
# # ============================================================

# eyes_closed = False

# closed_frames = 0

# eye_closed_start_time = None

# eye_closed_duration = 0.0

# blink_count = 0


# # ============================================================
# # NODE PERSISTENCE
# # ============================================================

# def persist_driver_event(
#     status,
#     ear,
#     face_detected=True
# ):
#     """
#     Post a driver status change to Node.js.

#     Only sends data when the status changes.
#     """

#     global last_persisted_status

#     if status == last_persisted_status:
#         return

#     # Map AI status to eye status.
#     eye_status = (
#         "closed"
#         if status in ("DROWSY", "EYES CLOSED")
#         else "open"
#     )

#     payload = {
#         "driverid": "driver001",
#         "face_detected": face_detected,
#         "driverStatus": status,
#         "eyeStatus": eye_status
#     }

#     try:

#         response = requests.post(
#             NODE_API_URL,
#             json=payload,
#             timeout=2
#         )

#         print(
#             f"[Node] Persisted status "
#             f"'{status}' → HTTP {response.status_code}"
#         )

#         last_persisted_status = status

#     except requests.exceptions.ConnectionError:

#         print(
#             "[Node] Backend not reachable "
#             "— event not persisted"
#         )

#     except Exception as e:

#         print(
#             f"[Node] Unexpected error "
#             f"persisting event: {e}"
#         )


# # ============================================================
# # UTILS
# # ============================================================

# def get_ratio(
#     landmarks,
#     points,
#     w,
#     h
# ):
#     """
#     Calculate EAR/MAR-style ratio from facial landmarks.
#     """

#     p = []

#     for i in points:

#         lm = landmarks[i]

#         p.append(
#             np.array(
#                 [
#                     lm.x * w,
#                     lm.y * h
#                 ]
#             )
#         )

#     v_dist = (
#         np.linalg.norm(p[1] - p[5])
#         +
#         np.linalg.norm(p[2] - p[4])
#     )

#     h_dist = np.linalg.norm(
#         p[0] - p[3]
#     )

#     return v_dist / (2.0 * h_dist)


# # ============================================================
# # DRAW EYE
# # ============================================================

# def draw_eye(
#     frame,
#     landmarks,
#     eye_points,
#     w,
#     h
# ):

#     pts = []

#     for idx in eye_points:

#         x = int(
#             landmarks[idx].x * w
#         )

#         y = int(
#             landmarks[idx].y * h
#         )

#         pts.append((x, y))

#     # Eye contour
#     for i in range(len(pts)):

#         cv2.line(
#             frame,
#             pts[i],
#             pts[(i + 1) % len(pts)],
#             (0, 255, 255),
#             1
#         )

#     # Horizontal EAR line
#     cv2.line(
#         frame,
#         pts[0],
#         pts[3],
#         (255, 0, 0),
#         2
#     )

#     # Vertical EAR lines
#     cv2.line(
#         frame,
#         pts[1],
#         pts[5],
#         (0, 255, 0),
#         2
#     )

#     cv2.line(
#         frame,
#         pts[2],
#         pts[4],
#         (0, 255, 0),
#         2
#     )


# # ============================================================
# # DRAW MOUTH
# # ============================================================

# def draw_mouth(
#     frame,
#     landmarks,
#     mouth_points,
#     w,
#     h
# ):

#     pts = []

#     for idx in mouth_points:

#         x = int(
#             landmarks[idx].x * w
#         )

#         y = int(
#             landmarks[idx].y * h
#         )

#         pts.append((x, y))

#     for i in range(len(pts)):

#         cv2.line(
#             frame,
#             pts[i],
#             pts[(i + 1) % len(pts)],
#             (255, 0, 255),
#             2
#         )


# # ============================================================
# # EYE STATE ENGINE
# # ============================================================

# def update_eye_state(raw_ear):

#     global eyes_closed
#     global closed_frames
#     global eye_closed_start_time
#     global eye_closed_duration
#     global blink_count

#     # --------------------------------------------------------
#     # Smooth EAR
#     # --------------------------------------------------------

#     smoothed_ear = smooth_ear(raw_ear)

#     current_time = time.time()

#     # ========================================================
#     # CURRENTLY OPEN
#     # ========================================================

#     if not eyes_closed:

#         if smoothed_ear < EAR_CLOSED_THRESHOLD:

#             closed_frames += 1

#             # Don't immediately classify as closed.
#             if closed_frames >= MIN_CLOSED_FRAMES:

#                 eyes_closed = True

#                 eye_closed_start_time = current_time

#                 eye_closed_duration = 0.0

#         else:

#             closed_frames = 0

#     # ========================================================
#     # CURRENTLY CLOSED
#     # ========================================================

#     else:

#         if eye_closed_start_time is not None:

#             eye_closed_duration = (
#                 current_time
#                 -
#                 eye_closed_start_time
#             )

#         # ----------------------------------------------------
#         # Eye recovery
#         # ----------------------------------------------------

#         if smoothed_ear > EAR_RECOVERY_THRESHOLD:

#             # A short closure is considered a blink.
#             if eye_closed_duration < 1.0:

#                 blink_count += 1

#             eyes_closed = False

#             closed_frames = 0

#             eye_closed_start_time = None

#             eye_closed_duration = 0.0

#     eye_state = (
#         "CLOSED"
#         if eyes_closed
#         else "OPEN"
#     )

#     return (
#         smoothed_ear,
#         eye_state,
#         blink_count,
#         eye_closed_duration
#     )


# # ============================================================
# # EYE CONDITION
# # ============================================================

# def classify_eye_condition(
#     eye_state,
#     eye_closed_duration
# ):

#     if eye_state == "OPEN":

#         return "NORMAL"

#     if eye_closed_duration < 1.5:

#         return "EYES CLOSED"

#     return "DROWSY"


# # ============================================================
# # MAIN DETECTOR
# # ============================================================

# def run_detector():

#     global eye_counter
#     global yawn_counter
#     global pitch_history
#     global output_frame
#     global last_alert_time

#     global blink_count
#     global eyes_closed
#     global closed_frames
#     global eye_closed_start_time
#     global eye_closed_duration

#     cap = cv2.VideoCapture(0)

#     while cap.isOpened():

#         success, frame = cap.read()

#         if not success:

#             continue

#         # ----------------------------------------------------
#         # Mirror camera
#         # ----------------------------------------------------

#         frame = cv2.flip(
#             frame,
#             1
#         )

#         h, w, _ = frame.shape

#         # ----------------------------------------------------
#         # Convert BGR → RGB
#         # ----------------------------------------------------

#         rgb = cv2.cvtColor(
#             frame,
#             cv2.COLOR_BGR2RGB
#         )

#         # ----------------------------------------------------
#         # MediaPipe
#         # ----------------------------------------------------

#         results = face_mesh.process(rgb)

#         status = "ALERT"

#         # ====================================================
#         # FACE DETECTED
#         # ====================================================

#         if results.multi_face_landmarks:

#             face_landmarks = (
#                 results.multi_face_landmarks[0]
#             )

#             landmarks = (
#                 face_landmarks.landmark
#             )

#             # ------------------------------------------------
#             # Draw Face Mesh
#             # ------------------------------------------------

#             drawing_utils.draw_landmarks(

#                 frame,

#                 face_landmarks,

#                 mp_face_mesh.FACEMESH_TESSELATION,

#                 landmark_drawing_spec=None,

#                 connection_drawing_spec=(
#                     mp.solutions.drawing_utils.DrawingSpec(
#                         color=(0, 255, 255),
#                         thickness=1
#                     )
#                 )
#             )

#             # =================================================
#             # EAR
#             # =================================================

#             ear_left = get_ratio(
#                 landmarks,
#                 RIGHT_EYE,
#                 w,
#                 h
#             )

#             ear_right = get_ratio(
#                 landmarks,
#                 LEFT_EYE,
#                 w,
#                 h
#             )

#             raw_ear = (
#                 ear_left + ear_right
#             ) / 2.0

#             (
#                 smoothed_ear,
#                 eye_state,
#                 blink_count,
#                 eye_closed_duration
#             ) = update_eye_state(
#                 raw_ear
#             )

#             # =================================================
#             # MAR
#             # =================================================

#             mar = get_ratio(
#                 landmarks,
#                 MOUTH,
#                 w,
#                 h
#             )

#             # =================================================
#             # HEAD MOVEMENT
#             # =================================================

#             pitch = (
#                 landmarks[1].y
#                 -
#                 landmarks[10].y
#             )

#             pitch_history.append(
#                 pitch
#             )

#             if len(pitch_history) > 20:

#                 pitch_history.pop(0)

#             pitch_std = np.std(
#                 pitch_history
#             )

#             # =================================================
#             # DRAW
#             # =================================================

#             draw_eye(
#                 frame,
#                 landmarks,
#                 LEFT_EYE,
#                 w,
#                 h
#             )

#             draw_eye(
#                 frame,
#                 landmarks,
#                 RIGHT_EYE,
#                 w,
#                 h
#             )

#             draw_mouth(
#                 frame,
#                 landmarks,
#                 MOUTH,
#                 w,
#                 h
#             )

#             # =================================================
#             # EYE CONDITION
#             # =================================================

#             eye_condition = (
#                 classify_eye_condition(
#                     eye_state,
#                     eye_closed_duration
#                 )
#             )

#             # =================================================
#             # CURRENT STATUS
#             # =================================================

#             # For STEP 1 we only allow the improved eye
#             # detector to control drowsiness.
#             #
#             # Yawning and head movement will be rewritten
#             # in later steps.

#             if eye_condition == "DROWSY":

#                 status = "DROWSY"

#             elif eye_condition == "EYES CLOSED":

#                 status = "EYES CLOSED"

#             else:

#                 status = "ALERT"

#             # =================================================
#             # ALERT
#             # =================================================

#             if status == "DROWSY":

#                 current_time = time.time()

#                 if (
#                     current_time
#                     -
#                     last_alert_time
#                     >
#                     ALERT_COOLDOWN
#                 ):

#                     try:

#                         winsound.Beep(
#                             1000,
#                             500
#                         )

#                     except Exception:

#                         pass

#                     last_alert_time = (
#                         current_time
#                     )

#             # =================================================
#             # DISPLAY
#             # =================================================

#             ear_color = (
#                 (0, 0, 255)
#                 if smoothed_ear < EAR_CLOSED_THRESHOLD
#                 else
#                 (0, 255, 0)
#             )

#             cv2.putText(

#                 frame,

#                 f"EAR: {smoothed_ear:.3f}",

#                 (20, 40),

#                 cv2.FONT_HERSHEY_SIMPLEX,

#                 0.8,

#                 ear_color,

#                 2
#             )

#             cv2.putText(

#                 frame,

#                 f"MAR: {mar:.2f}",

#                 (20, 70),

#                 cv2.FONT_HERSHEY_SIMPLEX,

#                 0.8,

#                 (255, 255, 0),

#                 2
#             )

#             cv2.putText(

#                 frame,

#                 f"Head: {pitch_std:.4f}",

#                 (20, 100),

#                 cv2.FONT_HERSHEY_SIMPLEX,

#                 0.7,

#                 (0, 255, 0),

#                 2
#             )

#             cv2.putText(

#                 frame,

#                 f"Eye: {eye_state}",

#                 (20, 135),

#                 cv2.FONT_HERSHEY_SIMPLEX,

#                 0.8,

#                 (0, 255, 0)
#                 if eye_state == "OPEN"
#                 else
#                 (0, 165, 255),

#                 2
#             )

#             cv2.putText(

#                 frame,

#                 f"Closed: {eye_closed_duration:.2f}s",

#                 (20, 170),

#                 cv2.FONT_HERSHEY_SIMPLEX,

#                 0.7,

#                 (0, 165, 255),

#                 2
#             )

#             cv2.putText(

#                 frame,

#                 f"Blinks: {blink_count}",

#                 (20, 205),

#                 cv2.FONT_HERSHEY_SIMPLEX,

#                 0.7,

#                 (255, 255, 255),

#                 2
#             )

#             cv2.putText(

#                 frame,

#                 f"Status: {status}",

#                 (20, 245),

#                 cv2.FONT_HERSHEY_SIMPLEX,

#                 0.9,

#                 (
#                     (0, 0, 255)
#                     if status == "DROWSY"
#                     else
#                     (0, 165, 255)
#                     if status == "EYES CLOSED"
#                     else
#                     (0, 255, 0)
#                 ),

#                 2
#             )

#             # =================================================
#             # SOCKET.IO
#             # =================================================

#             socketio.emit(
#                 "metrics",
#                 {
#                     "ear": round(
#                         smoothed_ear,
#                         3
#                     ),

#                     "rawEar": round(
#                         raw_ear,
#                         3
#                     ),

#                     "mar": round(
#                         mar,
#                         3
#                     ),

#                     "pitch": round(
#                         pitch_std,
#                         5
#                     ),

#                     "eyeState": eye_state,

#                     "eyeClosedDuration": round(
#                         eye_closed_duration,
#                         2
#                     ),

#                     "blinkCount": blink_count,

#                     "status": status
#                 }
#             )

#             # =================================================
#             # NODE / MONGODB
#             # =================================================

#             persist_driver_event(
#                 status,
#                 smoothed_ear,
#                 face_detected=True
#             )

#         # ====================================================
#         # NO FACE
#         # ====================================================

#         else:

#             # Don't accidentally carry old eye state forever.
#             # For now, simply report that no face is detected.

#             socketio.emit(
#                 "metrics",
#                 {
#                     "ear": 0,
#                     "rawEar": 0,
#                     "mar": 0,
#                     "pitch": 0,

#                     "eyeState": "UNKNOWN",

#                     "eyeClosedDuration": 0,

#                     "blinkCount": blink_count,

#                     "status": "NO FACE"
#                 }
#             )

#         # ====================================================
#         # STORE FRAME
#         # ====================================================

#         output_frame = frame.copy()

#         time.sleep(0.05)


# # ============================================================
# # VIDEO STREAM
# # ============================================================

# @app.route("/video")
# def video():

#     def generate():

#         global output_frame

#         while True:

#             if output_frame is None:

#                 continue

#             ret, buffer = cv2.imencode(
#                 ".jpg",
#                 output_frame
#             )

#             if not ret:

#                 continue

#             frame = buffer.tobytes()

#             yield (
#                 b"--frame\r\n"
#                 b"Content-Type: image/jpeg\r\n\r\n"
#                 +
#                 frame
#                 +
#                 b"\r\n"
#             )

#     return Response(
#         generate(),
#         mimetype=(
#             "multipart/x-mixed-replace; "
#             "boundary=frame"
#         )
#     )


# # ============================================================
# # MAIN
# # ============================================================

# if __name__ == "__main__":

#     socketio.start_background_task(
#         run_detector
#     )

#     socketio.run(
#         app,
#         host="0.0.0.0",
#         port=5000,
#         use_reloader=False,
#         allow_unsafe_werkzeug=True
#     )



import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, Response
from flask_socketio import SocketIO
import time
import winsound
import requests
from collections import deque


# ============================================================
# CONFIGURATION
# ============================================================

# -------------------- Calibration --------------------
# Instead of one fixed EAR threshold for every face, we measure
# THIS driver's own "eyes open" EAR for a few seconds at startup
# and set thresholds relative to it. This is the single biggest
# fix for both false alarms (hooded eyes / glasses / camera
# angle naturally give a lower EAR) and missed detection
# (some faces sit well above 0.20 even when sleepy).

CALIBRATION_DURATION = 3.0            # seconds to sample open-eye EAR
CALIBRATION_MIN_SAMPLES = 15          # need at least this many frames
CALIBRATION_CLOSE_RATIO = 0.78        # closed threshold = baseline * this
CALIBRATION_RECOVER_RATIO = 0.86      # recovery threshold = baseline * this

# Used only if calibration fails (no face detected in time, etc.)
FALLBACK_EAR_CLOSED_THRESHOLD = 0.20
FALLBACK_EAR_RECOVERY_THRESHOLD = 0.23

# -------------------- Eye Detection Timing --------------------
# All timing below is wall-clock based (time.time()), NOT frame
# counts. Frame counts are unreliable because your actual FPS
# depends on hardware + how long mediapipe takes per frame.

# EAR must stay below the closed threshold continuously for this
# long before we trust it (filters single-frame landmark noise,
# NOT blinks — a normal blink is still allowed to register).
MIN_CLOSE_CONFIRM_SEC = 0.15

# A closure shorter than this is a normal blink, not an event.
BLINK_MAX_DURATION = 0.4

# Continuous closure longer than this shows an "EYES CLOSED"
# warning state (driver is not yet classified as drowsy).
EYES_CLOSED_WARNING_SEC = 0.6

# Continuous closure longer than this = microsleep -> DROWSY.
# Kept short on purpose: this is the "already happening" case
# and should fire fast.
DROWSY_DURATION_SEC = 1.2

# Number of EAR samples used for exponential smoothing.
# (EMA reacts faster than a plain moving average of the same
# window, which reduces the lag before we notice closed eyes.)
EAR_EMA_ALPHA = 0.5

# -------------------- Fatigue Trend (PERCLOS) --------------------
# PERCLOS = percentage of eye closure over a rolling time window.
# This is the standard drowsiness-research metric and it catches
# a driver who is blinking longer/more often than normal WITHOUT
# ever hitting one single long closure — something a pure
# duration threshold misses entirely.

PERCLOS_WINDOW_SEC = 60.0
PERCLOS_MIN_HISTORY_SEC = 15.0        # don't trust PERCLOS until we have this much history
PERCLOS_FATIGUE_THRESHOLD = 0.25      # 25% of the last 60s spent with eyes closed

# -------------------- Existing thresholds --------------------

MAR_THRESHOLD = 0.60

HEAD_THRESHOLD = 0.005

# -------------------- Alert --------------------

ALERT_COOLDOWN = 5.0


# ============================================================
# EAR SMOOTHING (exponential moving average — lower lag than a
# plain moving average with the same amount of smoothing)
# ============================================================

_ema_ear = None


def smooth_ear(current_ear):
    global _ema_ear

    if _ema_ear is None:
        _ema_ear = current_ear
    else:
        _ema_ear = (
            EAR_EMA_ALPHA * current_ear
            + (1 - EAR_EMA_ALPHA) * _ema_ear
        )

    return _ema_ear


# ============================================================
# FLASK / SOCKET.IO
# ============================================================

app = Flask(__name__)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)


# ============================================================
# NODE.JS BACKEND
# ============================================================

NODE_API_URL = (
    "http://localhost:4000/api/v8/ai/driver-event"
)


# ============================================================
# MEDIAPIPE
# ============================================================

mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    refine_landmarks=True
)

drawing_utils = mp.solutions.drawing_utils


# ============================================================
# FACIAL LANDMARKS
# ============================================================

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]
MOUTH = [78, 81, 13, 308, 14, 178]


# ============================================================
# STATE
# ============================================================

output_frame = None
last_alert_time = 0
last_persisted_status = None

pitch_history = []

# Eye state
eyes_closed = False
eye_below_threshold_since = None
eye_closed_start_time = None
eye_closed_duration = 0.0
blink_count = 0

# PERCLOS history: deque of (timestamp, is_closed)
perclos_samples = deque()

# Calibration results (filled in before the main loop starts)
EAR_CLOSED_THRESHOLD = FALLBACK_EAR_CLOSED_THRESHOLD
EAR_RECOVERY_THRESHOLD = FALLBACK_EAR_RECOVERY_THRESHOLD
calibration_baseline_ear = None


# ============================================================
# NODE PERSISTENCE
# ============================================================

def persist_driver_event(status, ear, face_detected=True):
    """
    Post a driver status change to Node.js.
    Only sends data when the status changes.
    """

    global last_persisted_status

    if status == last_persisted_status:
        return

    eye_status = (
        "closed"
        if status in ("DROWSY", "EYES CLOSED")
        else "open"
    )

    payload = {
        "driverid": "driver001",
        "face_detected": face_detected,
        "driverStatus": status,
        "eyeStatus": eye_status
    }

    try:
        response = requests.post(NODE_API_URL, json=payload, timeout=2)
        print(f"[Node] Persisted status '{status}' -> HTTP {response.status_code}")
        last_persisted_status = status

    except requests.exceptions.ConnectionError:
        print("[Node] Backend not reachable - event not persisted")

    except Exception as e:
        print(f"[Node] Unexpected error persisting event: {e}")


# ============================================================
# UTILS
# ============================================================

def get_ratio(landmarks, points, w, h):
    """Calculate EAR/MAR-style ratio from facial landmarks."""

    p = []
    for i in points:
        lm = landmarks[i]
        p.append(np.array([lm.x * w, lm.y * h]))

    v_dist = np.linalg.norm(p[1] - p[5]) + np.linalg.norm(p[2] - p[4])
    h_dist = np.linalg.norm(p[0] - p[3])

    return v_dist / (2.0 * h_dist)


# ============================================================
# DRAW EYE / MOUTH (unchanged)
# ============================================================

def draw_eye(frame, landmarks, eye_points, w, h):
    pts = []
    for idx in eye_points:
        x = int(landmarks[idx].x * w)
        y = int(landmarks[idx].y * h)
        pts.append((x, y))

    for i in range(len(pts)):
        cv2.line(frame, pts[i], pts[(i + 1) % len(pts)], (0, 255, 255), 1)

    cv2.line(frame, pts[0], pts[3], (255, 0, 0), 2)
    cv2.line(frame, pts[1], pts[5], (0, 255, 0), 2)
    cv2.line(frame, pts[2], pts[4], (0, 255, 0), 2)


def draw_mouth(frame, landmarks, mouth_points, w, h):
    pts = []
    for idx in mouth_points:
        x = int(landmarks[idx].x * w)
        y = int(landmarks[idx].y * h)
        pts.append((x, y))

    for i in range(len(pts)):
        cv2.line(frame, pts[i], pts[(i + 1) % len(pts)], (255, 0, 255), 2)


# ============================================================
# CALIBRATION
# ============================================================

def calibrate_baseline_ear(cap):
    """
    Sample this driver's own open-eye EAR for CALIBRATION_DURATION
    seconds and return the average. Returns None if calibration
    fails (e.g. no face detected), in which case the caller should
    fall back to the fixed default thresholds.
    """

    samples = []
    start = time.time()

    while time.time() - start < CALIBRATION_DURATION:

        success, frame = cap.read()
        if not success:
            continue

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark

            ear_a = get_ratio(landmarks, RIGHT_EYE, w, h)
            ear_b = get_ratio(landmarks, LEFT_EYE, w, h)
            raw_ear = (ear_a + ear_b) / 2.0
            samples.append(raw_ear)

        # Let the viewer see something is happening.
        cv2.putText(
            frame,
            "Calibrating... keep eyes open, look at camera",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 255),
            2
        )

        global output_frame
        output_frame = frame.copy()
        time.sleep(0.03)

    if len(samples) < CALIBRATION_MIN_SAMPLES:
        print("[Calibration] Not enough samples, using fallback thresholds.")
        return None

    baseline = float(np.median(samples))
    print(f"[Calibration] Baseline open-eye EAR = {baseline:.3f}")
    return baseline


# ============================================================
# EYE STATE ENGINE (time-based, not frame-count-based)
# ============================================================

def update_eye_state(raw_ear):

    global eyes_closed
    global eye_below_threshold_since
    global eye_closed_start_time
    global eye_closed_duration
    global blink_count

    smoothed_ear = smooth_ear(raw_ear)
    now = time.time()

    is_below = smoothed_ear < EAR_CLOSED_THRESHOLD
    is_recovered = smoothed_ear > EAR_RECOVERY_THRESHOLD

    if not eyes_closed:

        if is_below:
            if eye_below_threshold_since is None:
                eye_below_threshold_since = now

            elif now - eye_below_threshold_since >= MIN_CLOSE_CONFIRM_SEC:
                # Confirmed closed. Backdate the start time to when
                # the eyes actually started closing (not to "now"),
                # so eye_closed_duration is accurate from the start.
                eyes_closed = True
                eye_closed_start_time = eye_below_threshold_since
                eye_closed_duration = now - eye_closed_start_time
        else:
            eye_below_threshold_since = None

    else:

        eye_closed_duration = now - eye_closed_start_time

        if is_recovered:
            if eye_closed_duration < BLINK_MAX_DURATION:
                blink_count += 1

            eyes_closed = False
            eye_below_threshold_since = None
            eye_closed_start_time = None
            eye_closed_duration = 0.0

    # ---- PERCLOS bookkeeping ----
    perclos_samples.append((now, eyes_closed))
    while perclos_samples and now - perclos_samples[0][0] > PERCLOS_WINDOW_SEC:
        perclos_samples.popleft()

    eye_state = "CLOSED" if eyes_closed else "OPEN"

    return smoothed_ear, eye_state, blink_count, eye_closed_duration


def compute_perclos():
    """
    Fraction of time, over the trailing PERCLOS_WINDOW_SEC, that
    the eyes were classified as closed. Returns (perclos, history_span).
    """

    if len(perclos_samples) < 2:
        return 0.0, 0.0

    span = perclos_samples[-1][0] - perclos_samples[0][0]
    if span < PERCLOS_MIN_HISTORY_SEC:
        return 0.0, span

    closed_time = 0.0
    prev_t, prev_closed = perclos_samples[0]

    for t, closed in list(perclos_samples)[1:]:
        if prev_closed:
            closed_time += t - prev_t
        prev_t, prev_closed = t, closed

    return closed_time / span, span


# ============================================================
# EYE CONDITION
# ============================================================

def classify_eye_condition(eye_state, eye_closed_duration, perclos, perclos_span):

    if eye_state == "CLOSED":
        if eye_closed_duration >= DROWSY_DURATION_SEC:
            return "DROWSY"
        if eye_closed_duration >= EYES_CLOSED_WARNING_SEC:
            return "EYES CLOSED"
        # Still within blink range - don't alarm yet.
        return "NORMAL"

    # Eyes currently open: check the longer-term fatigue trend.
    if perclos_span >= PERCLOS_MIN_HISTORY_SEC and perclos >= PERCLOS_FATIGUE_THRESHOLD:
        return "FATIGUE TREND"

    return "NORMAL"


# ============================================================
# MAIN DETECTOR
# ============================================================

def run_detector():

    global pitch_history
    global output_frame
    global last_alert_time
    global EAR_CLOSED_THRESHOLD
    global EAR_RECOVERY_THRESHOLD
    global calibration_baseline_ear

    cap = cv2.VideoCapture(0)

    # ---- Calibration pass ----
    baseline = calibrate_baseline_ear(cap)

    if baseline is not None:
        calibration_baseline_ear = baseline
        EAR_CLOSED_THRESHOLD = baseline * CALIBRATION_CLOSE_RATIO
        EAR_RECOVERY_THRESHOLD = baseline * CALIBRATION_RECOVER_RATIO
    else:
        EAR_CLOSED_THRESHOLD = FALLBACK_EAR_CLOSED_THRESHOLD
        EAR_RECOVERY_THRESHOLD = FALLBACK_EAR_RECOVERY_THRESHOLD

    print(
        f"[Calibration] closed_threshold={EAR_CLOSED_THRESHOLD:.3f} "
        f"recovery_threshold={EAR_RECOVERY_THRESHOLD:.3f}"
    )

    while cap.isOpened():

        success, frame = cap.read()
        if not success:
            continue

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        status = "ALERT"

        if results.multi_face_landmarks:

            face_landmarks = results.multi_face_landmarks[0]
            landmarks = face_landmarks.landmark

            drawing_utils.draw_landmarks(
                frame,
                face_landmarks,
                mp_face_mesh.FACEMESH_TESSELATION,
                landmark_drawing_spec=None,
                connection_drawing_spec=mp.solutions.drawing_utils.DrawingSpec(
                    color=(0, 255, 255), thickness=1
                )
            )

            # ---- EAR ----
            ear_a = get_ratio(landmarks, RIGHT_EYE, w, h)
            ear_b = get_ratio(landmarks, LEFT_EYE, w, h)
            raw_ear = (ear_a + ear_b) / 2.0

            (
                smoothed_ear,
                eye_state,
                blink_count,
                eye_closed_duration
            ) = update_eye_state(raw_ear)

            perclos, perclos_span = compute_perclos()

            # ---- MAR (display only, unchanged from original) ----
            mar = get_ratio(landmarks, MOUTH, w, h)

            # ---- Head movement (display only, unchanged) ----
            pitch = landmarks[1].y - landmarks[10].y
            pitch_history.append(pitch)
            if len(pitch_history) > 20:
                pitch_history.pop(0)
            pitch_std = np.std(pitch_history)

            draw_eye(frame, landmarks, LEFT_EYE, w, h)
            draw_eye(frame, landmarks, RIGHT_EYE, w, h)
            draw_mouth(frame, landmarks, MOUTH, w, h)

            # ---- Eye condition / status ----
            eye_condition = classify_eye_condition(
                eye_state, eye_closed_duration, perclos, perclos_span
            )

            if eye_condition in ("DROWSY", "EYES CLOSED", "FATIGUE TREND"):
                status = eye_condition
            else:
                status = "ALERT"

            # ---- Alert sound: only for real drowsiness, not the
            #      slower fatigue-trend warning, to avoid over-alerting ----
            if status == "DROWSY":
                current_time = time.time()
                if current_time - last_alert_time > ALERT_COOLDOWN:
                    try:
                        winsound.Beep(1000, 500)
                    except Exception:
                        pass
                    last_alert_time = current_time

            # ---- Display ----
            ear_color = (0, 0, 255) if smoothed_ear < EAR_CLOSED_THRESHOLD else (0, 255, 0)

            cv2.putText(frame, f"EAR: {smoothed_ear:.3f}", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, ear_color, 2)
            cv2.putText(frame, f"MAR: {mar:.2f}", (20, 70),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
            cv2.putText(frame, f"Head: {pitch_std:.4f}", (20, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(frame, f"Eye: {eye_state}", (20, 135),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8,
                        (0, 255, 0) if eye_state == "OPEN" else (0, 165, 255), 2)
            cv2.putText(frame, f"Closed: {eye_closed_duration:.2f}s", (20, 170),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
            cv2.putText(frame, f"Blinks: {blink_count}", (20, 205),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"PERCLOS(60s): {perclos * 100:.1f}%", (20, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(
                frame, f"Status: {status}", (20, 280),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9,
                (0, 0, 255) if status == "DROWSY"
                else (0, 165, 255) if status in ("EYES CLOSED", "FATIGUE TREND")
                else (0, 255, 0),
                2
            )

            # ---- Socket.IO ----
            socketio.emit("metrics", {
                "ear": round(smoothed_ear, 3),
                "rawEar": round(raw_ear, 3),
                "mar": round(mar, 3),
                "pitch": round(pitch_std, 5),
                "eyeState": eye_state,
                "eyeClosedDuration": round(eye_closed_duration, 2),
                "blinkCount": blink_count,
                "perclos": round(perclos, 3),
                "status": status,
                "earClosedThreshold": round(EAR_CLOSED_THRESHOLD, 3),
                "earRecoveryThreshold": round(EAR_RECOVERY_THRESHOLD, 3)
            })

            # ---- Node / MongoDB ----
            persist_driver_event(status, smoothed_ear, face_detected=True)

        else:
            socketio.emit("metrics", {
                "ear": 0, "rawEar": 0, "mar": 0, "pitch": 0,
                "eyeState": "UNKNOWN", "eyeClosedDuration": 0,
                "blinkCount": blink_count, "perclos": 0,
                "status": "NO FACE",
                "earClosedThreshold": round(EAR_CLOSED_THRESHOLD, 3),
                "earRecoveryThreshold": round(EAR_RECOVERY_THRESHOLD, 3)
            })

        output_frame = frame.copy()
        time.sleep(0.05)


# ============================================================
# VIDEO STREAM
# ============================================================

@app.route("/video")
def video():

    def generate():
        global output_frame
        while True:
            if output_frame is None:
                continue

            ret, buffer = cv2.imencode(".jpg", output_frame)
            if not ret:
                continue

            frame = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + frame + b"\r\n"
            )

    return Response(
        generate(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    socketio.start_background_task(run_detector)

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
