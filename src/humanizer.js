'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Rule-based humanization engine
//  Works 100% offline, no API key needed
// ─────────────────────────────────────────────────────────────────────────────

function detectKeyContext(key) {
  const k = key.toLowerCase();
  if (/^(id|uuid|guid|_id)$/.test(k))          return 'identifier';
  if (/(_id|Id)$/.test(key))                    return 'reference';
  // FIX: lat/lng must come BEFORE datetime — "lat" ends in "at" which matched /(at)$/ in datetime
  if (/^(lat|latitude)$|_lat$|^lat_/i.test(k)) return 'latitude';
  if (/^(lon|lng|longitude)$|_lng$|_lon$|^lng_/i.test(k)) return 'longitude';
  // FIX: tightened datetime regex — require word boundary so "lat" no longer matches "at"
  // Also covers: last_login, logged_at, login_at, sent_on, expires_on, *_at, *_date, *_time
  // 'at' only matches as suffix (_at$) not as infix (at_bat would match (^|_)at(_) — excluded)
  if (/(created|updated|modified|timestamp|datetime|last_login|logged_at|login_at|signed_in)(_at)?$|(^|_)(date|time|on)(_|$)|_at$/i.test(k)) return 'datetime';
  if (/(email|mail)$/i.test(k))                 return 'email';
  if (/(url|uri|href|link|website)$/i.test(k))  return 'url';
  if (/(phone|tel|mobile|fax)$/i.test(k))       return 'phone';
  if (/(price|cost|amount|salary|wage|fee|balance)/i.test(k)) return 'money';
  // FIX: duration must come BEFORE count — 'processing_ms_total' has _total$ (count) and ms (duration)
  // duration wins because the key explicitly signals time (ms, seconds, timeout, etc.)
  if (/(^duration$|_duration$|^elapsed|_elapsed|^timeout|_timeout|^ttl$|_ttl$|(^|_)ms($|_)|(^|_)ms[_a-z]|_ms$|seconds|minutes)/i.test(k)) return 'duration';
  // FIX: use word boundaries so 'country' doesn't match 'count', 'document' doesn't match 'num', etc.
  if (/(^count$|_count$|^qty|quantity|^num$|_num$|^total$|_total$|^sum$|_sum$|^size$|_size$|^length$|_length$)/i.test(k)) return 'count';
  if (/(password|secret|token|key|hash)/i.test(k)) return 'sensitive';
  if (/(name|title|label|heading|subject)/i.test(k)) return 'name';
  if (/(desc|description|about|bio|summary|notes|comment|text|body|content)/i.test(k)) return 'description';
  if (/(status|state|phase|stage)/i.test(k))    return 'status';
  if (/(type|kind|category|group|tag|class)/i.test(k)) return 'category';
  // FIX: require is_/has_ prefix, or common flag suffixes/names
  // bare "active" alone should NOT be boolean-flag (it's a status), but "enabled", "visible", "public" are flags by convention
  if (/(^is_|^has_|_enabled$|_active$|_visible$|_public$|^enabled$|^disabled$|^visible$|^public$)/i.test(k)) return 'boolean-flag';
  if (/(^age$|_age$|^age_)/i.test(k))           return 'age';
  if (/(version|ver)/i.test(k))                 return 'version';
  if (/(color|colour)/i.test(k))                return 'color';
  if (/(address|city|country|region|zip|postal)/i.test(k)) return 'location';
  if (/(rating|score|rank)/i.test(k))           return 'rating';
  if (/(error|err|exception|message|msg)/i.test(k)) return 'error';
  // NEW: percentage/progress
  if (/(percent|pct|progress|completion)/i.test(k)) return 'percent';
  return 'generic';
}

const RU_KEY_TRANSLATIONS = {
  'id': 'идентификатор',
  'uuid': 'идентификатор',
  'guid': 'идентификатор',
  'user id': 'ID пользователя',
  'order id': 'ID заказа',
  'account id': 'ID аккаунта',
  'name': 'имя',
  'first name': 'имя',
  'last name': 'фамилия',
  'full name': 'полное имя',
  'username': 'логин',
  'title': 'заголовок',
  'email': 'эл. почта',
  'email address': 'адрес эл. почты',
  'phone': 'телефон',
  'password': 'пароль',
  'token': 'токен',
  'secret': 'секрет',
  'age': 'возраст',
  'balance': 'баланс',
  'price': 'цена',
  'cost': 'стоимость',
  'amount': 'сумма',
  'total': 'всего',
  'count': 'количество',
  'created at': 'дата создания',
  'updated at': 'дата обновления',
  'last login': 'последний вход',
  'status': 'статус',
  'state': 'состояние',
  'description': 'описание',
  'bio': 'о себе',
  'notes': 'заметки',
  'summary': 'сводка',
  'address': 'адрес',
  'city': 'город',
  'country': 'страна',
  'region': 'регион',
  'zip': 'почтовый индекс',
  'tags': 'теги',
  'role': 'роль',
  'is active': 'активен',
  'is admin': 'администратор',
  'enabled': 'включено',
  'visible': 'видимый',
  'rating': 'рейтинг',
  'score': 'оценка',
  'message': 'сообщение',
  'error': 'ошибка',
  'results': 'результаты',
  'details': 'детали',
  'version': 'версия',
  'color': 'цвет',
  'url': 'ссылка',
  'link': 'ссылка',
  'items': 'элементы',
};

function isRussian(lang) {
  return typeof lang === 'string' && (lang.toLowerCase() === 'ru' || lang.toLowerCase() === 'russian');
}

function pluralRu(n, forms) {
  const abs = Math.abs(Number(n) || 0);
  const n100 = abs % 100;
  const n10 = abs % 10;
  if (n100 >= 11 && n100 <= 19) return forms[2];
  if (n10 === 1) return forms[0];
  if (n10 >= 2 && n10 <= 4) return forms[1];
  return forms[2];
}

function humanizeKey(key, lang = 'en') {
  const normalized = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_\-\.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (isRussian(lang)) {
    return RU_KEY_TRANSLATIONS[normalized] || normalized;
  }
  return normalized;
}

function humanizeValue(value, key = '', depth = 0, lang = 'en') {
  const ru = isRussian(lang);
  if (value === null || value === undefined) return ru ? 'не указано' : 'not specified';
  if (value === '') return ru ? 'пусто' : 'empty';

  // FIX: js-yaml auto-parses ISO date strings into Date objects — handle them gracefully
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? (ru ? 'некорректная дата' : 'invalid date') : formatDatetime(value.toISOString(), lang);
  }

  const ctx  = detectKeyContext(key);
  const type = typeof value;

  if (type === 'boolean') {
    if (ctx === 'boolean-flag') {
      const label = humanizeKey(key, lang)
        .replace(/^is\s+/, '')
        .replace(/^has\s+/, '');
      if (ru) {
        return value ? `да (${label} включен(о))` : `нет (${label} выключен(о))`;
      }
      return value ? `yes (${label} is enabled)` : `no (${label} is disabled)`;
    }
    return value ? (ru ? 'да' : 'yes') : (ru ? 'нет' : 'no');
  }

  if (type === 'number') {
    if (ctx === 'money')    return formatMoney(value);
    if (ctx === 'count') {
      if (ru) return `${value.toLocaleString('ru-RU')} ${pluralRu(value, ['элемент', 'элемента', 'элементов'])}`;
      return `${value.toLocaleString()} item${value !== 1 ? 's' : ''}`;
    }
    if (ctx === 'rating')   return ru ? `${value} из 10` : `${value} out of 10`;
    if (ctx === 'age') {
      if (ru) return `${value} ${pluralRu(value, ['год', 'года', 'лет'])}`;
      return `${value} year${value !== 1 ? 's' : ''} old`;
    }
    if (ctx === 'latitude') return `${Math.abs(value)}° ${value >= 0 ? (ru ? 'с.ш.' : 'N') : (ru ? 'ю.ш.' : 'S')}`;
    if (ctx === 'longitude')return `${Math.abs(value)}° ${value >= 0 ? (ru ? 'в.д.' : 'E') : (ru ? 'з.д.' : 'W')}`;
    if (ctx === 'percent')  return `${value}%`;
    if (ctx === 'duration') return formatDuration(value, key, lang);
    return value.toLocaleString(ru ? 'ru-RU' : 'en-US');
  }

  if (type === 'string') {
    if (ctx === 'sensitive') return ru ? '*** (скрыто в целях безопасности)' : '*** (hidden for security)';
    if (ctx === 'datetime')  return formatDatetime(value, lang);
    if (ctx === 'email')     return ru ? `эл. почта: ${value}` : `email address: ${value}`;
    if (ctx === 'url')       return ru ? `ссылка: ${value}` : `link: ${value}`;
    if (ctx === 'phone')     return ru ? `телефон: ${value}` : `phone: ${value}`;
    if (ctx === 'color')     return ru ? `цвет ${value}` : `color ${value}`;
    if (ctx === 'version')   return ru ? `версия ${value}` : `version ${value}`;
    if (value.length > 200) {
      if (ru) return `${value.slice(0, 200)}… (сокращено, всего ${value.length} символов)`;
      return `${value.slice(0, 200)}… (truncated, ${value.length} characters total)`;
    }
    return value;
  }

  if (Array.isArray(value)) return humanizeArray(value, key, depth, lang);
  if (type === 'object')    return humanizeObject(value, depth + 1, lang);

  return String(value);
}

function formatMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// Smart duration formatter
function formatDuration(n, key = '', lang = 'en') {
  const k = key.toLowerCase();
  const ru = isRussian(lang);

  // If key implies milliseconds
  if (k.includes('ms') || k.includes('milli')) {
    if (n >= 3600000) return ru ? `${(n / 3600000).toFixed(1)} ч` : `${(n / 3600000).toFixed(1)} hours`;
    if (n >= 60000)   return ru ? `${(n / 60000).toFixed(1)} мин` : `${(n / 60000).toFixed(1)} minutes`;
    if (n >= 1000)    return ru ? `${(n / 1000).toFixed(1)} сек` : `${(n / 1000).toFixed(1)} seconds`;
    return ru ? `${n} мс` : `${n} ms`;
  }
  // Assume seconds
  if (n >= 3600) return ru ? `${(n / 3600).toFixed(1)} ч` : `${(n / 3600).toFixed(1)} hours`;
  if (n >= 60)   return ru ? `${(n / 60).toFixed(1)} мин` : `${(n / 60).toFixed(1)} minutes`;
  if (ru) return `${n} ${pluralRu(n, ['секунда', 'секунды', 'секунд'])}`;
  return `${n} second${n !== 1 ? 's' : ''}`;
}

function formatDatetime(str, lang = 'en') {
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const isUTC = typeof str === 'string' && (str.endsWith('Z') || str.includes('+00:00') || str.includes('-00:00'));
    const isRu = isRussian(lang);
    const formatted = d.toLocaleString(isRu ? 'ru-RU' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      ...(isUTC ? { timeZone: 'UTC' } : {})
    });
    // In English en-US, Node sometimes outputs "March 15, 2024, 10:30 AM" or "March 15, 2024 at 10:30 AM"
    // Standardize comma before time to " at " if needed to match expected format
    if (!isRu && formatted.includes(',') && !formatted.includes(' at ')) {
      const lastComma = formatted.lastIndexOf(',');
      return formatted.slice(0, lastComma) + ' at' + formatted.slice(lastComma + 1);
    }
    return formatted;
  } catch {
    return str;
  }
}

function humanizeArray(arr, key = '', depth = 0, lang = 'en') {
  const ru = isRussian(lang);
  if (arr.length === 0) return ru ? 'пустой список' : 'an empty list';

  const firstType   = typeof arr[0];
  const allSameType = arr.every(i => typeof i === firstType);
  const label       = humanizeKey(key, lang) || (ru ? 'элементы' : 'items');

  if (allSameType && ['string', 'number', 'boolean'].includes(firstType) && arr.length <= 8) {
    const formatted = arr.map(v => humanizeValue(v, '', depth, lang));
    if (formatted.length === 1) return formatted[0];
    const last = formatted.pop();
    return ru ? `${formatted.join(', ')} и ${last}` : `${formatted.join(', ')} and ${last}`;
  }

  const preview = humanizeValue(arr[0], '', depth + 1, lang);
  if (ru) {
    return `коллекция из ${arr.length} ${pluralRu(arr.length, ['элемента', 'элементов', 'элементов'])} (например: ${preview}${arr.length > 1 ? ', и др.' : ''})`;
  }
  return `a collection of ${arr.length} ${label} (e.g. ${preview}${arr.length > 1 ? ', and more' : ''})`;
}

function humanizeObject(obj, depth = 0, lang = 'en') {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  const ru = isRussian(lang);
  if (entries.length === 0) return ru ? 'пустой объект' : 'an empty object';

  const sentences = [];
  const indent    = '  '.repeat(depth);

  for (const [key, value] of entries) {
    const label = humanizeKey(key, lang);
    const ctx   = detectKeyContext(key);

    if (Array.isArray(value)) {
      if (value.length === 0) {
        sentences.push(`${indent}• ${capitalize(label)}: ${ru ? 'пусто' : 'none'}`);
      } else if (isScalarArray(value)) {
        sentences.push(`${indent}• ${capitalize(label)}: ${humanizeArray(value, key, depth, lang)}`);
      } else {
        const countLabel = ru
          ? `${value.length} ${pluralRu(value.length, ['запись', 'записи', 'записей'])}`
          : `${value.length} entr${value.length === 1 ? 'y' : 'ies'}`;
        sentences.push(`${indent}• ${capitalize(label)}: ${countLabel}`);
        value.slice(0, 5).forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            sentences.push(`${indent}  [${i + 1}] ${humanizeObject(item, depth + 1, lang)}`);
          } else {
            sentences.push(`${indent}  [${i + 1}] ${humanizeValue(item, '', depth + 1, lang)}`);
          }
        });
        if (value.length > 5) {
          sentences.push(`${indent}  ${ru ? `… и ещё ${value.length - 5}` : `… and ${value.length - 5} more`}`);
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      if (value instanceof Date) {
        const hval = humanizeValue(value, key, depth, lang);
        sentences.push(`${indent}• ${capitalize(label)}: ${hval}`);
      } else {
        sentences.push(`${indent}• ${capitalize(label)}:`);
        sentences.push(humanizeObject(value, depth + 1, lang));
      }
    } else {
      const hval = humanizeValue(value, key, depth, lang);
      if (ctx === 'identifier') {
        sentences.push(`${indent}• ${ru ? 'Идентификатор' : 'Identifier'}: ${hval}`);
      } else if (ctx === 'description') {
        sentences.push(`${indent}• ${capitalize(label)}: "${hval}"`);
      } else {
        sentences.push(`${indent}• ${capitalize(label)}: ${hval}`);
      }
    }
  }

  return sentences.join('\n');
}

function isScalarArray(arr) {
  return arr.every(i => typeof i !== 'object' || i === null);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Top-level shape detection
// ─────────────────────────────────────────────────────────────────────────────

function detectTopLevelShape(data) {
  if (Array.isArray(data)) {
    if (data.length === 0) return { shape: 'empty-array' };
    if (typeof data[0] === 'object' && data[0] !== null)
      return { shape: 'record-list', count: data.length };
    return { shape: 'scalar-list', count: data.length };
  }
  if (typeof data === 'object' && data !== null) {
    const keys = Object.keys(data);
    if ('data' in data && ('meta' in data || 'links' in data || 'pagination' in data))
      return { shape: 'api-response' };
    if ('error' in data || 'errors' in data || ('message' in data && 'code' in data))
      return { shape: 'error-response' };
    if ('users' in data || 'items' in data || 'results' in data || 'records' in data)
      return { shape: 'collection' };
    if (keys.length <= 2)
      return { shape: 'simple-object' };
    return { shape: 'complex-object', keys: keys.length };
  }
  return { shape: 'primitive' };
}

/**
 * Returns a format label for use in intro sentences.
 * @param {'json'|'yaml'|'toml'|string} [sourceFormat]
 * @param {string} [lang='en']
 */
function formatLabel(sourceFormat, lang = 'en') {
  const ru = isRussian(lang);
  switch ((sourceFormat || 'json').toLowerCase()) {
    case 'yaml': case 'yml': return 'YAML';
    case 'toml':             return 'TOML';
    default:                 return ru ? 'JSON' : 'data';
  }
}

function buildIntro(data, shape, sourceFormat, lang = 'en') {
  const lbl = formatLabel(sourceFormat, lang);
  const ru  = isRussian(lang);

  if (ru) {
    switch (shape.shape) {
      case 'empty-array':
        return `Этот ${lbl} содержит пустой список без элементов.`;
      case 'record-list':
        return `Этот ${lbl} содержит список из ${shape.count} ${pluralRu(shape.count, ['записи', 'записей', 'записей'])}.`;
      case 'scalar-list':
        return `Этот ${lbl} содержит список из ${shape.count} ${pluralRu(shape.count, ['значения', 'значений', 'значений'])}.`;
      case 'api-response':
        return `Этот ${lbl} является ответом API с данными и метаданными.`;
      case 'error-response':
        return `Этот ${lbl} описывает ошибку или сбой.`;
      case 'collection':
        return `Этот ${lbl} содержит коллекцию ресурсов.`;
      case 'simple-object':
        return `Этот ${lbl} содержит простой объект с несколькими полями.`;
      case 'complex-object':
        return `Этот ${lbl} содержит структурированный объект из ${shape.keys} ${pluralRu(shape.keys, ['поля', 'полей', 'полей'])}.`;
      case 'primitive':
        return `Этот ${lbl} содержит одно значение: ${String(data)}.`;
      default:
        return `Этот ${lbl} содержит следующие данные:`;
    }
  }

  switch (shape.shape) {
    case 'empty-array':
      return `This ${lbl} contains an empty list with no items.`;
    case 'record-list':
      return `This ${lbl} contains a list of ${shape.count} record${shape.count !== 1 ? 's' : ''}.`;
    case 'scalar-list':
      return `This ${lbl} contains a list of ${shape.count} value${shape.count !== 1 ? 's' : ''}.`;
    case 'api-response':
      return `This ${lbl} is an API response with data and metadata.`;
    case 'error-response':
      return `This ${lbl} describes an error or failure response.`;
    case 'collection':
      return `This ${lbl} contains a collection of resources.`;
    case 'simple-object':
      return `This ${lbl} contains a simple object with a few fields.`;
    case 'complex-object':
      return `This ${lbl} contains a structured object with ${shape.keys} fields.`;
    case 'primitive':
      return `This ${lbl} contains a single value: ${String(data)}.`;
    default:
      return `This ${lbl} contains the following data:`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {any}    data
 * @param {object} [options]
 * @param {string} [options.mode='structured']
 * @param {string} [options.sourceFormat]  'json' | 'yaml' | 'toml'
 * @param {string} [options.lang='English']
 */
function humanizeLocal(data, options = {}) {
  const { mode = 'structured', sourceFormat, lang = 'en' } = options;
  if (mode === 'story') {
    return humanizeToStory(data, options);
  }
  if (mode === 'prose') {
    return humanizeToProse(data, options);
  }
  if (mode === 'sentence') {
    return humanizeToSentence(data, options);
  }
  const shape = detectTopLevelShape(data);
  const intro = buildIntro(data, shape, sourceFormat, lang);
  const ru    = isRussian(lang);

  if (shape.shape === 'primitive') return intro;

  let body = '';

  if (Array.isArray(data)) {
    if (isScalarArray(data)) {
      body = ru ? `\nЗначения: ${humanizeArray(data, 'items', 0, lang)}` : `\nValues: ${humanizeArray(data, 'items', 0, lang)}`;
    } else {
      const lines = [];
      const limit = Math.min(data.length, 20);
      for (let i = 0; i < limit; i++) {
        const item = data[i];
        if (typeof item === 'object' && item !== null) {
          lines.push(`\n${ru ? 'Запись' : 'Record'} ${i + 1}:\n${humanizeObject(item, 1, lang)}`);
        } else {
          lines.push(`\n${ru ? 'Элемент' : 'Item'} ${i + 1}: ${humanizeValue(item, '', 0, lang)}`);
        }
      }
      if (data.length > 20) {
        lines.push(`\n${ru ? `… и ещё ${data.length - 20} записей` : `… and ${data.length - 20} more records`}`);
      }
      body = lines.join('');
    }
  } else {
    body = '\n' + humanizeObject(data, 0, lang);
  }

  return `${intro}\n${body}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Sentence mode — condenses data into one or a few natural sentences
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a flat object's key-value pairs into a comma-separated sentence fragment.
 */
function objectToSentenceFragment(obj, maxFields = 6, lang = 'en') {
  const ru = isRussian(lang);
  const entries = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .slice(0, maxFields);

  if (entries.length === 0) return ru ? 'нет полей' : 'no fields';

  const parts = entries.map(([key, value]) => {
    const label = humanizeKey(key, lang);
    const ctx   = detectKeyContext(key);
    if (ctx === 'sensitive') return ru ? `${label} скрыт(о)` : `${label} is hidden`;
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return ru
          ? `${label} содержит ${value.length} ${pluralRu(value.length, ['элемент', 'элемента', 'элементов'])}`
          : `${label} has ${value.length} item${value.length !== 1 ? 's' : ''}`;
      }
      return ru ? `${label} — это объект` : `${label} is an object`;
    }
    if (ctx === 'boolean-flag' && typeof value === 'boolean') {
      if (ru) return `${label} ${value ? 'включен(о)' : 'выключен(о)'}`;
      return `${label} is ${value ? 'active' : 'inactive'}`;
    }
    if (['email', 'url', 'phone', 'color', 'version'].includes(ctx)) {
      if (ru) return `${label}: ${String(value)}`;
      return `${label} is ${String(value)}`;
    }
    const val = humanizeValue(value, key, 0, lang);
    if (ru) return `${label}: ${val}`;
    return `${label} is ${val}`;
  });

  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return ru ? `${parts.join(', ')} и ${last}` : `${parts.join(', ')}, and ${last}`;
}

/**
 * Humanize data as a concise natural sentence or short paragraph.
 */
function humanizeToSentence(data, options = {}) {
  const { sourceFormat, maxItems = 3, lang = 'en' } = options;
  const lbl = formatLabel(sourceFormat, lang);
  const ru  = isRussian(lang);

  if (data === null || data === undefined) return ru ? 'Значение пусто.' : 'The value is empty.';
  if (typeof data !== 'object') {
    return ru
      ? `Этот ${lbl} содержит одно значение: ${humanizeValue(data, '', 0, lang)}.`
      : `The ${lbl} contains a single value: ${humanizeValue(data)}.`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return ru ? `Этот ${lbl} содержит пустой список.` : `The ${lbl} contains an empty list.`;

    if (isScalarArray(data)) {
      const fragment = humanizeArray(data, 'items', 0, lang);
      return ru
        ? `Этот ${lbl} содержит ${data.length} ${pluralRu(data.length, ['значение', 'значения', 'значений'])}: ${fragment}.`
        : `The ${lbl} contains ${data.length} value${data.length !== 1 ? 's' : ''}: ${fragment}.`;
    }

    const shown = data.slice(0, maxItems);
    const sentences = shown.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        return ru
          ? `Запись ${i + 1} содержит ${objectToSentenceFragment(item, 6, lang)}.`
          : `Record ${i + 1} has ${objectToSentenceFragment(item)}.`;
      }
      return ru
        ? `Элемент ${i + 1}: ${humanizeValue(item, '', 0, lang)}.`
        : `Item ${i + 1} is ${humanizeValue(item)}.`;
    });

    const remainder = data.length - shown.length;
    if (remainder > 0) {
      if (ru) {
        sentences.push(`Ещё ${remainder} ${pluralRu(remainder, ['запись', 'записи', 'записей'])}.`);
      } else {
        sentences.push(`There ${remainder === 1 ? 'is' : 'are'} ${remainder} more record${remainder !== 1 ? 's' : ''}.`);
      }
    }

    const intro = ru
      ? `Этот ${lbl} содержит список из ${data.length} ${pluralRu(data.length, ['записи', 'записей', 'записей'])}. `
      : `This ${lbl} lists ${data.length} record${data.length !== 1 ? 's' : ''}. `;
    return intro + sentences.join(' ');
  }

  const keys = Object.keys(data).filter(k => data[k] !== undefined);
  if (keys.length === 0) return ru ? `Этот ${lbl} является пустым объектом.` : `The ${lbl} is an empty object.`;

  const fragment = objectToSentenceFragment(data, 8, lang);
  return ru
    ? `Этот ${lbl} описывает запись, где ${fragment}.`
    : `This ${lbl} describes a record where ${fragment}.`;
}

/**
 * Humanize data as a narrative story connecting the fields together.
 */
function humanizeToStory(data, options = {}) {
  const { sourceFormat, lang = 'en' } = options;
  const ru  = isRussian(lang);
  const lbl = formatLabel(sourceFormat, lang);

  if (data === null || data === undefined) {
    return ru ? 'Это короткая история о пустоте: данных нет.' : 'This is a brief story of emptiness: no data was provided.';
  }

  if (typeof data !== 'object') {
    return ru
      ? `История одного значения: перед нами одиночный элемент со значением ${humanizeValue(data, '', 0, lang)}.`
      : `The story of a single value: here stands an individual entry with value ${humanizeValue(data, '', 0, lang)}.`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return ru ? 'Это история о пустом списке, ожидающем своих первых записей.' : 'This is a story of an empty collection waiting for its first entries.';
    }
    const countStr = `${data.length} ${ru ? pluralRu(data.length, ['записи', 'записей', 'записей']) : `record${data.length !== 1 ? 's' : ''}`}`;
    const p1 = ru
      ? `Перед нами разворачивается хроника из ${countStr}.`
      : `Here unfolds a chronicle gathering ${countStr}.`;

    const sampleStories = data.slice(0, 3).map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        const frag = objectToSentenceFragment(item, 5, lang);
        return ru
          ? `Эпизод ${idx + 1}: ${frag}.`
          : `Episode ${idx + 1}: ${frag}.`;
      }
      return ru
        ? `Элемент ${idx + 1}: ${humanizeValue(item, '', 0, lang)}.`
        : `Item ${idx + 1}: ${humanizeValue(item, '', 0, lang)}.`;
    });

    const remainder = data.length - sampleStories.length;
    const remainderStr = remainder > 0
      ? (ru ? ` Далее хроника продолжается ещё ${remainder} ${pluralRu(remainder, ['записью', 'записями', 'записями'])}.` : ` The chronicle proceeds further with ${remainder} more record${remainder !== 1 ? 's' : ''}.`)
      : '';

    return `${p1}\n\n${sampleStories.join(' ')}${remainderStr}`;
  }

  const keys = Object.keys(data);
  if (keys.length === 0) {
    return ru ? 'Перед нами пустая запись без единого поля.' : 'Here lies an empty record with no fields recorded.';
  }

  // Detect special shapes: error
  if ('error' in data || 'errors' in data) {
    const errObj = typeof data.error === 'object' && data.error !== null ? data.error : data;
    const code = errObj.code || errObj.status || data.code;
    const msg = errObj.message || errObj.msg || data.message || (typeof data.error === 'string' ? data.error : '');
    const details = errObj.details || errObj.detail || data.details;
    const ts = data.timestamp || errObj.timestamp || data.time;

    const parts = [];
    if (ru) {
      parts.push(`В системе произошел инцидент: зафиксирована ошибка${code ? ` с кодом ${code}` : ''}.`);
      if (msg) parts.push(`Сообщение системы гласит: «${msg}».`);
      if (details) parts.push(`Дополнительные подробности: ${details}.`);
      if (ts) parts.push(`Событие произошло ${formatDatetime(ts, lang)}.`);
    } else {
      parts.push(`A system incident was registered: an error occurred${code ? ` with code ${code}` : ''}.`);
      if (msg) parts.push(`The message reports: "${msg}".`);
      if (details) parts.push(`Further details: ${details}.`);
      if (ts) parts.push(`The incident took place on ${formatDatetime(ts, lang)}.`);
    }
    return parts.join(' ');
  }

  // General Entity / Document Story:
  const nameKey = keys.find(k => /^(name|title|username|full_name)$/i.test(k));
  const idKey = keys.find(k => /^(id|uuid|user_id|order_id)$/i.test(k));
  const createdKey = keys.find(k => /(created|registered|started|joined)(_at)?$/i.test(k));
  const updatedKey = keys.find(k => /(updated|modified|last_login|logged_at)(_at)?$/i.test(k));
  const statusKey = keys.find(k => /^(status|state)$/i.test(k));
  const activeKey = keys.find(k => /(^is_active$|^active$|^enabled$)/i.test(k));
  const emailKey = keys.find(k => /email/i.test(k));
  const phoneKey = keys.find(k => /phone/i.test(k));
  const cityKey = keys.find(k => /city/i.test(k));
  const countryKey = keys.find(k => /country/i.test(k));
  const moneyKey = keys.find(k => /(balance|price|salary|total|cost|amount)/i.test(k));
  const tagsKey = keys.find(k => /^(tags|features|roles)$/i.test(k));
  const ageKey = keys.find(k => /^age$/i.test(k));
  const ratingKey = keys.find(k => /^(rating|score)$/i.test(k));

  const sentences = [];

  // Opening
  const subjectName = nameKey ? String(data[nameKey]) : '';
  const idVal = idKey ? String(data[idKey]) : '';
  if (subjectName && idVal) {
    sentences.push(ru ? `Это история о ${subjectName} (${humanizeKey(idKey, lang)}: ${idVal}).` : `This is the story of ${subjectName} (${humanizeKey(idKey, lang)}: ${idVal}).`);
  } else if (subjectName) {
    sentences.push(ru ? `Перед нами история о ${subjectName}.` : `This is the story of ${subjectName}.`);
  } else if (idVal) {
    sentences.push(ru ? `Перед нами запись объекта с идентификатором ${idVal}.` : `This record represents an entity identified as ${idVal}.`);
  } else {
    sentences.push(ru ? `Перед нами история одного структурированного объекта.` : `Here is the story told by this data object.`);
  }

  // Age / personal
  if (ageKey && typeof data[ageKey] === 'number') {
    sentences.push(ru ? `Возраст составляет ${data[ageKey]} ${pluralRu(data[ageKey], ['год', 'года', 'лет'])}.` : `Currently ${data[ageKey]} years old.`);
  }

  // Timeline
  if (createdKey && data[createdKey]) {
    const cTime = formatDatetime(data[createdKey], lang);
    if (updatedKey && data[updatedKey]) {
      const uTime = formatDatetime(data[updatedKey], lang);
      sentences.push(ru
        ? `История началась ${cTime}, а последнее обновление или вход был зафиксирован ${uTime}.`
        : `The journey began on ${cTime}, with the latest activity noted on ${uTime}.`);
    } else {
      sentences.push(ru ? `Событие или регистрация датируется ${cTime}.` : `Originated on ${cTime}.`);
    }
  } else if (updatedKey && data[updatedKey]) {
    sentences.push(ru ? `Последняя активность зафиксирована ${formatDatetime(data[updatedKey], lang)}.` : `Most recent activity occurred on ${formatDatetime(data[updatedKey], lang)}.`);
  }

  // Status & flags
  if (statusKey && data[statusKey]) {
    const sVal = humanizeValue(data[statusKey], statusKey, 0, lang);
    sentences.push(ru ? `Текущий статус — ${sVal}.` : `The operational status stands as ${sVal}.`);
  }
  if (activeKey && typeof data[activeKey] === 'boolean') {
    if (ru) sentences.push(data[activeKey] ? 'Запись активна и находится в рабочем состоянии.' : 'Запись в данный момент неактивна.');
    else sentences.push(data[activeKey] ? 'The profile is currently active.' : 'The profile is currently inactive.');
  }

  // Metrics & money
  if (moneyKey && data[moneyKey] !== undefined) {
    const mVal = humanizeValue(data[moneyKey], moneyKey, 0, lang);
    const mLabel = humanizeKey(moneyKey, lang);
    sentences.push(ru ? `Показатель ${mLabel} составляет ${mVal}.` : `The recorded ${mLabel} equals ${mVal}.`);
  }
  if (ratingKey && data[ratingKey] !== undefined) {
    const rVal = humanizeValue(data[ratingKey], ratingKey, 0, lang);
    sentences.push(ru ? `Рейтинг оценивается как ${rVal}.` : `The rating is evaluated at ${rVal}.`);
  }

  // Contact & Location
  const contactParts = [];
  if (emailKey && data[emailKey]) contactParts.push(ru ? `эл. почта ${data[emailKey]}` : `email at ${data[emailKey]}`);
  if (phoneKey && data[phoneKey]) contactParts.push(ru ? `телефон ${data[phoneKey]}` : `phone at ${data[phoneKey]}`);
  if (contactParts.length) {
    sentences.push(ru ? `Для контактов используется: ${contactParts.join(', ')}.` : `Contact channels include: ${contactParts.join(', ')}.`);
  }

  if ((cityKey && data[cityKey]) || (countryKey && data[countryKey])) {
    const loc = [data[cityKey], data[countryKey]].filter(Boolean).join(', ');
    sentences.push(ru ? `Географическое расположение: ${loc}.` : `Located in ${loc}.`);
  }

  // Tags
  if (tagsKey && Array.isArray(data[tagsKey]) && data[tagsKey].length) {
    const tList = data[tagsKey].join(', ');
    sentences.push(ru ? `С объектом связаны метки: ${tList}.` : `Associated with tags: ${tList}.`);
  }

  // Other remaining fields
  const handledKeys = new Set([nameKey, idKey, createdKey, updatedKey, statusKey, activeKey, emailKey, phoneKey, cityKey, countryKey, moneyKey, tagsKey, ageKey, ratingKey]);
  const remaining = keys.filter(k => !handledKeys.has(k) && data[k] !== undefined && data[k] !== null);

  const nestedObjects = remaining.filter(k => typeof data[k] === 'object' && !Array.isArray(data[k]));
  const nestedArrays  = remaining.filter(k => Array.isArray(data[k]));
  const scalars       = remaining.filter(k => typeof data[k] !== 'object');

  if (scalars.length > 0) {
    const scalarFrag = scalars.slice(0, 5).map(k => `${humanizeKey(k, lang)}: ${humanizeValue(data[k], k, 0, lang)}`).join(', ');
    sentences.push(ru ? `Среди других характеристик: ${scalarFrag}.` : `Additional attributes include: ${scalarFrag}.`);
  }

  if (nestedObjects.length > 0) {
    const nestedDescriptions = nestedObjects.slice(0, 3).map(k => {
      const frag = objectToSentenceFragment(data[k], 4, lang);
      return `${humanizeKey(k, lang)} (${frag})`;
    }).join('; ');
    sentences.push(ru ? `В структуре содержатся разделы: ${nestedDescriptions}.` : `The structure also contains sections: ${nestedDescriptions}.`);
  }

  if (nestedArrays.length > 0) {
    const arrDescriptions = nestedArrays.slice(0, 3).map(k => {
      const len = data[k].length;
      return `${humanizeKey(k, lang)} (${len} ${ru ? pluralRu(len, ['запись', 'записи', 'записей']) : `item${len !== 1 ? 's' : ''}`})`;
    }).join(', ');
    sentences.push(ru ? `Прикрепленные списки: ${arrDescriptions}.` : `Attached collections: ${arrDescriptions}.`);
  }

  return sentences.join(' ');
}

/**
 * Humanize data as flowing prose paragraphs without bullet points.
 */
function humanizeToProse(data, options = {}) {
  const { sourceFormat, lang = 'en' } = options;
  const ru  = isRussian(lang);
  const lbl = formatLabel(sourceFormat, lang);

  if (data === null || data === undefined) {
    return ru ? 'Значение отсутствует (пусто).' : 'The value is empty.';
  }

  if (typeof data !== 'object') {
    return ru
      ? `Этот ${lbl} содержит одиночное значение: ${humanizeValue(data, '', 0, lang)}.`
      : `This ${lbl} contains a single value: ${humanizeValue(data, '', 0, lang)}.`;
  }

  if (Array.isArray(data)) {
    return humanizeToSentence(data, options);
  }

  const keys = Object.keys(data);
  if (keys.length === 0) {
    return ru ? `Этот ${lbl} является пустым объектом без полей.` : `This ${lbl} is an empty object with no fields.`;
  }

  const p1Intro = ru
    ? `Этот ${lbl} содержит структурированные данные из ${keys.length} ${pluralRu(keys.length, ['поля', 'полей', 'полей'])}.`
    : `This ${lbl} contains structured data with ${keys.length} field${keys.length !== 1 ? 's' : ''}.`;

  const scalarEntries = Object.entries(data)
    .filter(([, v]) => typeof v !== 'object' && v !== null && v !== undefined);

  const nestedEntries = Object.entries(data)
    .filter(([, v]) => typeof v === 'object' && v !== null);

  const parts = [];
  parts.push(p1Intro);

  if (scalarEntries.length > 0) {
    const frag = objectToSentenceFragment(Object.fromEntries(scalarEntries), 8, lang);
    parts.push(ru ? `В записи указано, что ${frag}.` : `It records that ${frag}.`);
  }

  if (nestedEntries.length > 0) {
    const nestedParagraphs = nestedEntries.slice(0, 4).map(([k, v]) => {
      const label = humanizeKey(k, lang);
      if (Array.isArray(v)) {
        return ru
          ? `Раздел «${label}» содержит список из ${v.length} ${pluralRu(v.length, ['элемента', 'элементов', 'элементов'])}.`
          : `The "${label}" section contains a collection of ${v.length} item${v.length !== 1 ? 's' : ''}.`;
      }
      const frag = objectToSentenceFragment(v, 6, lang);
      return ru
        ? `Вложенный блок «${label}» включает в себя: ${frag}.`
        : `The nested block "${label}" includes: ${frag}.`;
    });
    parts.push(nestedParagraphs.join(' '));
  }

  return parts.join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
//  NEW: Extract a plain summary (top-level fields only, no bullets)
//  Useful for embedding in notifications, tooltips, etc.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single-line summary of the top-level keys/values.
 * @param {object|Array} data
 * @param {number} [maxFields=5]
 * @param {string} [lang='en']
 * @returns {string}
 */
function summarize(data, maxFields = 5, lang = 'en') {
  const ru = isRussian(lang);
  if (data === null || data === undefined) return ru ? 'пусто' : 'empty';
  if (Array.isArray(data)) {
    if (ru) return `${data.length} ${pluralRu(data.length, ['элемент', 'элемента', 'элементов'])}`;
    return `${data.length} item${data.length !== 1 ? 's' : ''}`;
  }
  if (typeof data !== 'object') return String(data);

  const entries = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
    .slice(0, maxFields);

  if (entries.length === 0) {
    const nested = Object.keys(data).length;
    if (ru) return `${nested} ${pluralRu(nested, ['поле', 'поля', 'полей'])}`;
    return `${nested} field${nested !== 1 ? 's' : ''}`;
  }

  return entries.map(([k, v]) => `${humanizeKey(k, lang)}: ${humanizeValue(v, k, 0, lang)}`).join(' · ');
}

module.exports = {
  humanizeLocal,
  humanizeToSentence,
  humanizeToStory,
  humanizeToProse,
  summarize,
  humanizeKey,
  humanizeValue,
  detectKeyContext,
  // Expose helpers for testing
  formatMoney,
  formatDatetime,
  formatDuration,
};
