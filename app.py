from flask import Flask, render_template, Response, jsonify, request
import os
import time
import re
import subprocess
import json

app = Flask(__name__)
stream_start_time = None
video_duration = None

def calculate_video_duration(filename):
    result = subprocess.run(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filename],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT)
    output = json.loads(result.stdout)
    return float(output['format']['duration'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/stream_video')
def stream_video():
    global stream_start_time, video_duration
    if stream_start_time is None:
        stream_start_time = time.time()
        video_path = os.path.join(app.root_path, 'static', 'test.mp4')
        video_duration = calculate_video_duration(video_path)

    video_path = os.path.join(app.root_path, 'static', 'test.mp4')
    range_header = request.headers.get('Range', None)
    byte1, byte2 = 0, None

    if range_header:
        match = re.search(r'(\d+)-(\d*)', range_header)
        groups = match.groups()
        
        if groups[0]:
            byte1 = int(groups[0])
        if groups[1]:
            byte2 = int(groups[1])

    if byte2 is None:
        byte2 = os.path.getsize(video_path) - 1

    length = byte2 - byte1 + 1

    with open(video_path, 'rb') as f:
        f.seek(byte1)
        data = f.read(length)

    rv = Response(data, 206, mimetype='video/mp4', direct_passthrough=True)
    rv.headers.add('Content-Range', f'bytes {byte1}-{byte2}/{os.path.getsize(video_path)}')
    rv.headers.add('Accept-Ranges', 'bytes')
    return rv

@app.route('/get_stream_time')
def get_stream_time():
    global stream_start_time, video_duration
    if stream_start_time is None:
        return jsonify({'stream_time': 0.0})
    current_time = time.time()
    stream_time = current_time - stream_start_time
    if video_duration is not None and stream_time > video_duration:
        stream_time = video_duration
    return jsonify({'stream_time': stream_time})

@app.route('/get_video_duration')
def get_video_duration():
    global video_duration
    return jsonify({'duration': video_duration})

if __name__ == '__main__':
    app.run(debug=True, port=80, host="0.0.0.0", threaded=True)