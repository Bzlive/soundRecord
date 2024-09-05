import { useEffect, useRef } from 'react';

/**
 * useRecord
 * @param {*} isStart 是否初始化完成就开始录音
 * @param {*} maxRecordTime 录音最大时长，单位秒，默认10分钟
 * @param {*} onUploadSuccess 录音结束回调
 * @param {*} timeChange 录音时长
 * @returns
 */
const useRecord = ({ isStart, maxRecordTime = 10 * 60, onUploadSuccess, timeChange }) => {
  // 录音器
  const mediaRecorder = useRef(null);
  // 录音去加载完成，开始开始录音
  let isStartRecord = isStart || false;
  // 录音时长
  let recordTime = 0;
  // 计时器
  let timer = null;
  // 录音资源
  let dataBuffer = [];
  // 清除录音资源
  const dataReset = () => {
    dataBuffer = [];
  };

  /**
   * 记录录音时长
   */
  const handleRecordTime = (type) => {
    if (type === 'stop') {
      timeChange?.({ time: recordTime, state: mediaRecorder.current?.state });
      return clearInterval(timer);
    }
    timer = setInterval(() => {
      if (recordTime >= maxRecordTime) {
        onStop();
        timeChange?.({ time: recordTime, state: 'inactive' });
        clearInterval(timer);
      } else {
        recordTime += 1;
        timeChange?.({ time: recordTime, state: mediaRecorder.current?.state });
      }
    }, 1000);
  };

  // 录音初始化
  const initMediaRecorder = async () => {
    if (!navigator?.mediaDevices) {
      alert('该浏览器不支持录音（mediaDevices）');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder.current = new MediaRecorder(stream, {
          mimeTyp: 'audio/mp3',
        });
        // 开始录音
        mediaRecorder.current.onstart = function (e) {
          recordTime = 0;
          handleRecordTime('start');
        };
        // 录音暂停
        mediaRecorder.current.onpause = function (e) {
          handleRecordTime('stop');
        };
        // 录音继续
        mediaRecorder.current.onresume = function (e) {
          handleRecordTime('start');
          dataReset();
        };
        // 录音结束
        mediaRecorder.current.onstop = function (e) {
          handleRecordTime('stop');
          onUploadSuccess(dataBuffer);
          // 增加延时，防止 onUploadSuccess 有异步操作
          setTimeout(() => {
              dataReset();
          })
        };
        // 录音错误
        mediaRecorder.current.onerror = function (e) {
          handleRecordTime('stop');
        };
        // 录制的资源，录音结束才会触发
        mediaRecorder.current.ondataavailable = function (e) {
          dataBuffer.push(e.data)
        };

        // 进入页面，录音器加载完后就开始录音
        if (isStartRecord) {
          onStart();
          isStartRecord = false;
        }
      })
      .catch((err) => {
      if (
          err.toString().includes('denied') &&
          (err.toString().includes('Permission') || err.toString().includes('permission'))
        ) {
          alert('录音授权失败，请清除缓存后再操作');
          return;
        }
        alert(err);
      });
  };

  // 开始录音
  const onStart = async () => {
    // state: inactive -未开始， recording - 录音中，paused - 录音暂停
    if (mediaRecorder?.current?.state === 'inactive') mediaRecorder.current?.start();
  };

  // 结束录音
  const onStop = () => {
    if (mediaRecorder.current && mediaRecorder.current?.state !== 'inactive') mediaRecorder.current.stop();
  };

  // 继续录音
  // isload 页面初次加载完成后开始录音
  const onContinue = async (isload) => {
    if (mediaRecorder?.current?.state === 'paused' && recordTime) mediaRecorder.current.resume();
    else if (!mediaRecorder?.current && isload && !recordTime) isStartRecord = true;
    else if (!recordTime) onStart();
  };

  // 暂停录音
  const onPause = () => {
    if (mediaRecorder?.current?.state === 'recording') mediaRecorder.current.pause();
  };

  // 录音兼容问题处理
  const initUserMedia = () => {
    // eslint-disable-next-line no-undef
    if (navigator.mediaDevices === undefined) {
      // eslint-disable-next-line no-undef
      navigator.mediaDevices = {};
    }

    // eslint-disable-next-line no-undef
    if (navigator.mediaDevices.getUserMedia === undefined) {
      // eslint-disable-next-line no-undef
      navigator.mediaDevices.getUserMedia = function (constraints) {
        // eslint-disable-next-line no-undef
        const getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        if (!getUserMedia) {
          return Promise.reject(new Error('浏览器不支持 getUserMedia !'));
        }

        return new Promise((resolve, reject) => {
          // eslint-disable-next-line no-undef
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      };
    }
  };

  /**
   * init
   */
  const initRecord = async () => {
    await initUserMedia();
    initMediaRecorder();
  };
  
  useEffect(() => {
    initRecord();
  }, []);

  return {
    onContinue,
    onStart,
    onStop,
    onPause,
  };
};

export default useRecord;
