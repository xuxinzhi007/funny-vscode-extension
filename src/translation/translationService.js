const vscode = require('vscode');
const https = require('https');
const crypto = require('crypto');
const { getLogger } = require('../utils/logger');

/**
 * 翻译服务管理器
 */
class TranslationService {
  constructor() {
    this.logger = getLogger();
    this.cache = new Map(); // 翻译缓存
    this.maxCacheSize = 1000;
  }

  /**
   * 获取配置的翻译API
   */
  getApiConfig() {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension.translation');
    return {
      provider: config.get('provider', 'baidu'),
      baiduAppId: config.get('baiduAppId', ''),
      baiduSecretKey: config.get('baiduSecretKey', ''),
      customApiUrl: config.get('customApiUrl', ''),
      customApiKey: config.get('customApiKey', ''),
      timeout: config.get('timeout', 5000)
    };
  }

  /**
   * 翻译文本
   */
  async translate(text, from = 'auto', to = 'zh') {
    if (!text || text.trim().length === 0) {
      return { error: '文本不能为空' };
    }

    // 检查缓存
    const cacheKey = `${text}_${from}_${to}`;
    if (this.cache.has(cacheKey)) {
      this.logger.info('Translation cache hit');
      return this.cache.get(cacheKey);
    }

    const config = this.getApiConfig();
    let result;

    try {
      switch (config.provider) {
        case 'baidu':
          result = await this.translateWithBaidu(text, from, to, config);
          break;
        case 'custom':
          result = await this.translateWithCustomApi(text, from, to, config);
          break;
        default:
          result = { error: '不支持的翻译服务' };
      }

      // 缓存结果
      if (result && !result.error) {
        this.addToCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      this.logger.error('Translation failed:', error);
      return { error: error.message };
    }
  }

  /**
   * 使用百度翻译API
   */
  async translateWithBaidu(text, from, to, config) {
    if (!config.baiduAppId || !config.baiduSecretKey) {
      return { error: '请先配置百度翻译 AppID 和密钥' };
    }

    const salt = Date.now();
    const sign = crypto
      .createHash('md5')
      .update(config.baiduAppId + text + salt + config.baiduSecretKey)
      .digest('hex');

    const params = new URLSearchParams({
      q: text,
      from: from,
      to: to,
      appid: config.baiduAppId,
      salt: salt.toString(),
      sign: sign
    });

    const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?${params}`;

    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: config.timeout }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.error_code) {
              resolve({ error: `百度翻译错误: ${result.error_msg || result.error_code}` });
            } else if (result.trans_result && result.trans_result.length > 0) {
              resolve({
                text: result.trans_result[0].dst,
                from: result.from,
                to: result.to
              });
            } else {
              resolve({ error: '翻译失败，未返回结果' });
            }
          } catch (e) {
            resolve({ error: '解析翻译结果失败' });
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    });
  }

  /**
   * 使用自定义翻译API
   */
  async translateWithCustomApi(text, from, to, config) {
    if (!config.customApiUrl) {
      return { error: '请先配置自定义API地址' };
    }

    // 这里提供一个通用的POST请求格式
    // 用户可以根据自己的API调整
    const postData = JSON.stringify({
      text: text,
      from: from,
      to: to,
      apiKey: config.customApiKey
    });

    return new Promise((resolve, reject) => {
      const url = new URL(config.customApiUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: config.timeout
      };

      if (config.customApiKey) {
        options.headers['Authorization'] = `Bearer ${config.customApiKey}`;
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            // 假设返回格式为 { translation: "翻译结果" }
            if (result.translation) {
              resolve({ text: result.translation, from, to });
            } else if (result.error) {
              resolve({ error: result.error });
            } else {
              resolve({ error: '自定义API返回格式不正确' });
            }
          } catch (e) {
            resolve({ error: '解析翻译结果失败' });
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * 添加到缓存
   */
  addToCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      // 删除最早的缓存项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('Translation cache cleared');
  }
}

// 单例
let translationService = null;

function getTranslationService() {
  if (!translationService) {
    translationService = new TranslationService();
  }
  return translationService;
}

module.exports = { getTranslationService };
