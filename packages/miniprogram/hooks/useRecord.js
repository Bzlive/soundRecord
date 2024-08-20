import Taro, {
  getSetting,
  authorize,
  openSetting,
  showModal,
} from '@tarojs/taro';
import { useEffect, useRef } from 'react';

// 录音最大时长
const maxDuration = 1000 * 60 * 10; // 时长，小程序仅支持 10 分钟录音（600000ms）
// 录音默认配置
const defaultOptions = {
  duration: maxDuration,
  format: 'mp3', // 文件格式
  numberOfChannels: 1,
};
// 全局的录音管理器
const recorderManager = Taro.getRecorderManager();

/**
 * 拜访打卡任务录音
 * @param {*} options 音频配置，见小程序文档
 * @param {*} onUploadSuccess 自定义上传回调
 * @param {*} isContinueRecord 超过10分钟是否继续录制，暂未实现
 * @returns
 */
const useRecord = ({ options = {}, onUploadSuccess, isContinueRecord = false } = {}) => {
  // 是否已开始录音
  let isRecording = false;
  // 是否手动结束
  let isManualEnd = false;
  // 继续录音失败
  let resuumeFial = false;

  /**
   * 开启/关闭屏幕常亮，防止录音时熄屏后录音失败
   */
  const setKeepScreenOn = (state = false) => {
    Taro.setKeepScreenOn({ keepScreenOn: state });
  };

  /**
   * 初始化全局录音组件
   */
  const initRecorderManager = () => {
    // 录音开始
    recorderManager.onStart(() => {
      resuumeFial = false;
      // 开始录音后，设置屏幕常亮；防止熄屏后录音失败
      setKeepScreenOn(true);
    });

    // 录音失败
    recorderManager.onError((res) => {
      // 锁屏或者息屏后，继续录音失败
      if (res.errMsg.includes('resume') && res.errMsg.includes('fail')) {
        resuumeFial = true;
        // 手动停止
        recorderManager.stop();
      }
      setKeepScreenOn(false);
      isRecording = false;
      isManualEnd = false;
    });

    // 录音结束
    recorderManager.onStop((res) => {
      // 关闭屏幕常亮设置
      setKeepScreenOn(false);
      // 录音时间小于1秒不做处理。
      if (res.duration < 1000) {
        Taro.showToast('录音时长需大于1秒');
        isRecording = false;
        return;
      }
      /** 手动停止录音 || 录音时间超过 10 分钟，触发上传文件 */
      if (isContinueRecord && res.duration >= maxDuration && !isManualEnd) {
        // 超过10分钟录音，再次开始录音
        continueRecord();
      } else if (!resuumeFial) {
        // 手动停止录音
        onUploadSuccess(res);
        isManualEnd = false;
      }
    });

    // 录音暂停
    recorderManager.onPause(() => {
      // 录音暂停后，继续录音
      if (isRecording) recorderManager.resume();
    });

    // 录音继续
    recorderManager.onResume(() => {
      resuumeFial = false;
    });

    // 中断结束事件
    recorderManager.onInterruptionEnd(() => {
      // 继续录音
      recorderManager.resume();
    });
  };

  /**
   * 开始录音
   */
  const startRecord = () => {
    if (isRecording) return;
    isRecording = true;
    initRecorderManager();
    recorderManager.start({
      ...defaultOptions,
      ...options,
    });
  };

  /**
   * 再次录音，用于超过10分钟后再次触发录音
   */
  const continueRecord = () => {
    recorderManager.start({
      ...defaultOptions,
      ...options,
    });
  };

  /**
   * 结束录音，录音上传
   */
  const stopRecord = () => {
    isManualEnd = true;
    recorderManager.stop(); // 结束录音
  };

  /**
   * 获取录音权限
   */
  function getRecordAuth() {
    return new Promise((resolve, reject) => {
      getSetting({
        success: (res) => {
          resolve(!!res.authSetting['scope.record']);
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
  }

  /**
   * 打开设置，授权录音权限
   */
  function openRecordAuth() {
    authorize({
      scope: 'scope.record',
      success: () => {},
      fail: () => {
        showModal({
          title: '录音需开启麦克风权限',
          confirmText: '前往开启',
          success: (data) => {
            if (data.confirm) {
              openSetting();
            } else if (data.cancel) {
              Taro.showToast('授权失败');
            }
          },
        });
      },
    });
  }

  return {
    startRecord,
    stopRecord,
    getRecordAuth,
    openRecordAuth,
  };
};

export default useRecord;

