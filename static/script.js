const video = document.getElementById('videoPlayer');
const playPauseBtn = document.getElementById('playPauseBtn');
const goLiveBtn = document.getElementById('goLiveBtn');
const timeDisplay = document.getElementById('timeDisplay');
const seekBar = document.getElementById('seekBar');
const seekBarProgress = document.getElementById('seekBarProgress');
const seekHandle = document.getElementById('seekHandle');
const volumeBtn = document.getElementById('volumeBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeControl = document.querySelector('.volume-control');
const volumeSliderContainer = document.querySelector('.volume-slider-container');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const videoContainer = document.querySelector('.video-container');
const controls = document.querySelector('.controls');
let controlsTimeout;
let isFirstPlay = true;
let serverTime = 0;
let isDragging = false;

function toggleControls() {
    if (document.fullscreenElement && !video.paused) {
        controls.style.opacity = '1';
        controls.style.visibility = 'visible';
        seekBar.style.opacity = '1';
        seekBar.style.visibility = 'visible';
        videoContainer.style.cursor = 'auto';

        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            controls.style.opacity = '0';
            controls.style.visibility = 'hidden';
            seekBar.style.opacity = '0';
            seekBar.style.visibility = 'hidden';
            
            videoContainer.style.cursor = 'none';
        }, 3000); 
    } else {
        controls.style.opacity = '1';
        controls.style.visibility = 'visible';
        seekBar.style.opacity = '1';
        seekBar.style.visibility = 'visible';
        
        videoContainer.style.cursor = 'auto';

        clearTimeout(controlsTimeout);
    }
}

playPauseBtn.onclick = () => {
    if (video.paused) {
        isFirstPlay ? goToLiveStream() : video.play();
        playPauseBtn.textContent = '❚❚';
        videoContainer.classList.add('video-playing');
    } else {
        video.pause();
        playPauseBtn.textContent = '▶';
        videoContainer.classList.remove('video-playing');
    }
    toggleControls();
};

video.addEventListener('play', () => {
    videoContainer.classList.add('video-playing');
    toggleControls();
});

video.addEventListener('pause', () => {
    videoContainer.classList.remove('video-playing');
    toggleControls();
});

videoContainer.addEventListener('mousemove', toggleControls);

document.addEventListener('fullscreenchange', toggleControls);

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.mozRequestFullScreen) { // Firefox
            videoContainer.mozRequestFullScreen();
        } else if (videoContainer.webkitRequestFullscreen) { // Chrome, Safari and Opera
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) { // IE/Edge
            videoContainer.msRequestFullscreen();
        }
        fullscreenBtn.textContent = '⛶';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
        fullscreenBtn.textContent = '⛶';
    }
}

fullscreenBtn.onclick = toggleFullScreen;

document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? '⛶' : '⛶';
});

function formatTime(seconds) {
    return [3600, 60, 1].map(scale => Math.floor((seconds / scale) % 60).toString().padStart(2, '0')).join(':');
}

function updateTimeDisplay() {
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(serverTime)}`;
}

function updateSeekBar() {
    if (!isDragging) {
        const progress = (video.currentTime / serverTime) * 100;
        if (progress >= 99.5) { // Consider it "live" if within 0.5% of the end
            seekBarProgress.style.width = '100%';
            seekHandle.style.left = '100%';
        } else {
            updateSeekHandlePosition(progress / 100);
        }
    }
}

function handleSeek(e) {
    const rect = seekBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTime = pos * serverTime;
    if (seekTime <= serverTime) {
        video.currentTime = seekTime;
        if (pos >= 0.995) { // Within 0.5% of the end
            seekBarProgress.style.width = '100%';
            seekHandle.style.left = '100%';
        } else {
            updateSeekHandlePosition(pos);
        }
    }
}

function updateSeekHandlePosition(pos) {
    const progress = pos * 100;
    seekBarProgress.style.width = `${progress}%`;
    seekHandle.style.left = `${progress}%`;
}

function goToLiveStream() {
    fetch('/get_stream_time')
        .then(response => response.json())
        .then(data => {
            serverTime = data.stream_time;
            video.currentTime = serverTime;
            video.play();
            isFirstPlay = false;
            playPauseBtn.textContent = '❚❚';
            updateSeekBar();
        });
}

function updateTime() {
    fetch('/get_stream_time')
        .then(response => response.json())
        .then(data => {
            serverTime = data.stream_time;
            updateSeekBar();
            updateTimeDisplay();
        });
}

playPauseBtn.onclick = () => {
    if (video.paused) {
        isFirstPlay ? goToLiveStream() : video.play();
        playPauseBtn.textContent = '❚❚';
    } else {
        video.pause();
        playPauseBtn.textContent = '▶';
    }
};

goLiveBtn.onclick = goToLiveStream;

seekBar.addEventListener('mousedown', e => {
    handleSeek(e);
    isDragging = true;
    document.addEventListener('mousemove', handleSeek);
    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.removeEventListener('mousemove', handleSeek);
    });
});

seekBar.addEventListener('click', handleSeek);

volumeBtn.onclick = () => {
    video.muted = !video.muted;
    volumeBtn.textContent = video.muted ? '🔇' : '🔊';
    volumeSlider.value = video.muted ? 0 : video.volume;
};

volumeSlider.oninput = function() {
    video.volume = this.value;
    video.muted = this.value === '0';
    volumeBtn.textContent = video.muted ? '🔇' : '🔊';
};

video.addEventListener('timeupdate', () => {
    updateSeekBar();
    updateTimeDisplay();
    volumeBtn.textContent = (video.volume === 0 || video.muted) ? '🔇' : '🔊';
});

volumeControl.addEventListener('mouseenter', () => {
    volumeSliderContainer.style.display = 'block';
    setTimeout(() => volumeSliderContainer.style.width = '100px', 0);
});

volumeControl.addEventListener('mouseleave', () => {
    volumeSliderContainer.style.width = '0';
    setTimeout(() => volumeSliderContainer.style.display = 'none', 300);
});

setInterval(updateTime, 500);

video.onloadedmetadata = () => video.pause();