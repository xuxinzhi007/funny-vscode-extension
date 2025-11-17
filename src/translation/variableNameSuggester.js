const { getTranslationService } = require('./translationService');
const { getLogger } = require('../utils/logger');

/**
 * 变量名建议器
 */
class VariableNameSuggester {
  constructor() {
    this.logger = getLogger();
    this.translationService = getTranslationService();
    
    // 常见编程命名规范
    this.namingConventions = {
      camelCase: (words) => {
        return words.map((w, i) => 
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join('');
      },
      PascalCase: (words) => {
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      },
      snake_case: (words) => {
        return words.map(w => w.toLowerCase()).join('_');
      },
      UPPER_SNAKE_CASE: (words) => {
        return words.map(w => w.toUpperCase()).join('_');
      },
      'kebab-case': (words) => {
        return words.map(w => w.toLowerCase()).join('-');
      }
    };
  }

  /**
   * 根据中文生成变量名建议
   */
  async suggestVariableNames(chineseText) {
    try {
      // 翻译成英文
      const result = await this.translationService.translate(chineseText, 'zh', 'en');
      
      if (result.error) {
        return { error: result.error };
      }

      // 处理翻译结果，提取关键词
      const englishText = result.text;
      const words = this.extractWords(englishText);

      // 生成不同命名风格的建议
      const suggestions = {
        camelCase: this.namingConventions.camelCase(words),
        PascalCase: this.namingConventions.PascalCase(words),
        snake_case: this.namingConventions.snake_case(words),
        UPPER_SNAKE_CASE: this.namingConventions.UPPER_SNAKE_CASE(words),
        'kebab-case': this.namingConventions['kebab-case'](words)
      };

      // 添加常见前缀/后缀变体
      const variants = this.generateVariants(words);

      return {
        original: chineseText,
        translation: englishText,
        suggestions,
        variants
      };
    } catch (error) {
      this.logger.error('Variable name suggestion failed:', error);
      return { error: error.message };
    }
  }

  /**
   * 从英文文本中提取单词
   */
  extractWords(text) {
    // 移除标点符号，分割单词
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0 && !this.isStopWord(w));
  }

  /**
   * 判断是否为停用词
   */
  isStopWord(word) {
    const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'to', 'in', 'for', 'on', 'with'];
    return stopWords.includes(word);
  }

  /**
   * 生成常见变体
   */
  generateVariants(words) {
    const base = this.namingConventions.camelCase(words);
    const variants = [];

    // 常见前缀
    const prefixes = ['get', 'set', 'is', 'has', 'can', 'should', 'on', 'handle'];
    prefixes.forEach(prefix => {
      const variant = prefix + base.charAt(0).toUpperCase() + base.slice(1);
      variants.push({ name: variant, description: `${prefix} 前缀` });
    });

    // 常见后缀
    const suffixes = ['List', 'Array', 'Map', 'Set', 'Count', 'Index', 'Id', 'Name', 'Type', 'Status'];
    suffixes.forEach(suffix => {
      const variant = base + suffix;
      variants.push({ name: variant, description: `${suffix} 后缀` });
    });

    return variants.slice(0, 10); // 限制返回数量
  }

  /**
   * 根据上下文智能建议
   */
  async suggestWithContext(chineseText, context = {}) {
    const result = await this.suggestVariableNames(chineseText);
    
    if (result.error) {
      return result;
    }

    // 根据上下文调整建议
    const { fileType, isConstant, isFunction, isClass } = context;

    let recommended;
    if (isClass) {
      recommended = result.suggestions.PascalCase;
    } else if (isConstant) {
      recommended = result.suggestions.UPPER_SNAKE_CASE;
    } else if (isFunction) {
      recommended = 'get' + result.suggestions.PascalCase;
    } else {
      recommended = result.suggestions.camelCase;
    }

    return {
      ...result,
      recommended,
      context
    };
  }
}

// 单例
let suggester = null;

function getVariableNameSuggester() {
  if (!suggester) {
    suggester = new VariableNameSuggester();
  }
  return suggester;
}

module.exports = { getVariableNameSuggester };
