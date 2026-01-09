/**
 * 日期工具函数
 */

/**
 * 格式化时间为 MM:SS
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化倒计时
 */
function formatCountdown(deadline) {
  const now = new Date();
  const diff = new Date(deadline) - now;
  
  if (diff < 0) {
    return { overdue: true, text: '已过期' };
  }
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  let text;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    text = `${days}天${hours % 24}小时`;
  } else if (hours > 0) {
    text = `${hours}小时${minutes}分钟`;
  } else {
    text = `${minutes}分钟`;
  }
  
  return { overdue: false, text, hours, minutes };
}

/**
 * 获取当前日期字符串 (YYYY-MM-DD)
 */
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 判断两个日期是否为同一天
 */
function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

/**
 * 获取距离现在的天数
 */
function getDaysDiff(date) {
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

module.exports = {
  formatTime,
  formatCountdown,
  getTodayString,
  isSameDay,
  getDaysDiff
};
