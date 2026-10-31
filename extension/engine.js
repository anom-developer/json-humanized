// ─────────────────────────────────────────────────────────────────────────────
//  json-humanized · Standalone Browser Engine
//  Works 100% offline, zero dependencies, English & Russian support
// ─────────────────────────────────────────────────────────────────────────────

const JH_RU_KEYS = {
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

function isRuLang(lang) {
  return typeof lang === 'string' && (lang.toLowerCase().startsWith('ru'));
}

function pluralRuWords(n, forms) {
  const abs = Math.abs(Number(n) || 0);
  const n100 = abs % 100;
  const n10 = abs % 10;
  if (n100 >= 11 && n100 <= 19) return forms[2];
  if (n10 === 1) return forms[0];
  if (n10 >= 2 && n10 <= 4) return forms[1];
  return forms[2];
}

function detectContext(k) {
  k = k.toLowerCase();
  if (/^(id|uuid|guid|_id)$/.test(k))                   return 'identifier';
  if (/(_id|id)$/i.test(k) && k !== 'valid')           return 'reference';
  if (/^(lat|latitude)$|_lat$/i.test(k))                return 'latitude';
  if (/^(lon|lng|longitude)$|_lng$/i.test(k))           return 'longitude';
  if (/(created|updated|modified|timestamp)(_at)?$|_at$|(^|_)(date|time|on)(_|$)|last_login|logged_at/i.test(k)) return 'datetime';
  if (/(email|mail)$/i.test(k))                        return 'email';
  if (/(url|uri|href|link|website)$/i.test(k))          return 'url';
  if (/(phone|tel|mobile|fax)$/i.test(k))               return 'phone';
  if (/(price|cost|amount|salary|wage|fee|balance)/i.test(k)) return 'money';
  if (/(duration|elapsed|timeout|ttl|_ms$|seconds|minutes)/i.test(k)) return 'duration';
  if (/(count|qty|quantity|num|total|sum|size|length)$/i.test(k))    return 'count';
  if (/(password|secret|token|key|hash)/i.test(k))     return 'sensitive';
  if (/(age)$/i.test(k))                               return 'age';
  if (/(rating|score|rank)/i.test(k))                  return 'rating';
  if (/(percent|pct|progress)/i.test(k))               return 'percent';
  if (/(^is_|^has_|_enabled$|_active$)/i.test(k))      return 'boolean-flag';
  return 'generic';
}

function formatKey(k, lang = 'en') {
  const base = k.replace(/([A-Z])/g, ' $1').replace(/[_\-\.]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  if (isRuLang(lang)) {
    return JH_RU_KEYS[base] || base;
  }
  return base;
}

function formatVal(v, key = '', lang = 'en') {
  const ru = isRuLang(lang);
  if (v === null || v === undefined) return ru ? 'не указано' : 'not specified';
  if (v === '') return ru ? 'пусто' : 'empty';

  const ctx = detectContext(key);

  if (typeof v === 'boolean') {
    if (ctx === 'boolean-flag') {
      const label = formatKey(key, lang).replace(/^is\s+/, '').replace(/^has\s+/, '');
      if (ru) return v ? `да (${label} включен(о))` : `нет (${label} выключен(о))`;
      return v ? `yes (${label} is enabled)` : `no (${label} is disabled)`;
    }
    return v ? (ru ? 'да' : 'yes') : (ru ? 'нет' : 'no');
  }

  if (ctx === 'sensitive') return ru ? '*** (скрыто в целях безопасности)' : '*** (hidden for security)';

  if (typeof v === 'number') {
    if (ctx === 'money') {
      if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
      if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
      return `$${v.toFixed(2)}`;
    }
    if (ctx === 'age') {
      if (ru) return `${v} ${pluralRuWords(v, ['год', 'года', 'лет'])}`;
      return `${v} year${v !== 1 ? 's' : ''} old`;
    }
    if (ctx === 'rating') return ru ? `${v} из 10` : `${v} out of 10`;
    if (ctx === 'percent') return `${v}%`;
    if (ctx === 'count') {
      if (ru) return `${v.toLocaleString('ru-RU')} ${pluralRuWords(v, ['элемент', 'элемента', 'элементов'])}`;
      return `${v.toLocaleString()} item${v !== 1 ? 's' : ''}`;
    }
    if (ctx === 'duration') {
      if (v >= 3600) return ru ? `${(v/3600).toFixed(1)} ч` : `${(v/3600).toFixed(1)} hours`;
      if (v >= 60) return ru ? `${(v/60).toFixed(1)} мин` : `${(v/60).toFixed(1)} minutes`;
      return ru ? `${v} сек` : `${v} seconds`;
    }
    return v.toLocaleString(ru ? 'ru-RU' : 'en-US');
  }

  if (typeof v === 'string') {
    if (ctx === 'datetime') {
      try {
        const d = new Date(v);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString(ru ? 'ru-RU' : 'en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            ...(v.endsWith('Z') || v.includes('+00:00') ? { timeZone: 'UTC' } : {})
          });
        }
      } catch {}
    }
    if (ctx === 'email') return ru ? `эл. почта: ${v}` : `email: ${v}`;
    if (ctx === 'url')   return ru ? `ссылка: ${v}` : `link: ${v}`;
    if (v.length > 200) return v.slice(0, 200) + '…';
    return v;
  }

  if (Array.isArray(v)) {
    if (!v.length) return ru ? 'пустой список' : 'an empty list';
    if (v.every(x => typeof x !== 'object')) {
      const formatted = v.map(item => formatVal(item, '', lang));
      if (formatted.length === 1) return formatted[0];
      const last = formatted.pop();
      return ru ? `${formatted.join(', ')} и ${last}` : `${formatted.join(', ')} and ${last}`;
    }
    return ru
      ? `коллекция из ${v.length} ${pluralRuWords(v.length, ['элемента', 'элементов', 'элементов'])}`
      : `${v.length} item(s)`;
  }

  if (typeof v === 'object') {
    return `{${Object.keys(v).length} ${ru ? 'полей' : 'field(s)'}}`;
  }

  return String(v);
}

function objectToLines(obj, depth = 0, lang = 'en') {
  const pfx = '  '.repeat(depth);
  const lines = [];
  const ru = isRuLang(lang);

  for (const [k, v] of Object.entries(obj)) {
    const label = formatKey(k, lang);
    const capitalized = label ? label.charAt(0).toUpperCase() + label.slice(1) : '';

    if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
      const countLabel = ru
        ? `${v.length} ${pluralRuWords(v.length, ['запись', 'записи', 'записей'])}`
        : `${v.length} entr${v.length === 1 ? 'y' : 'ies'}`;
      lines.push(`${pfx}• ${capitalized}: ${countLabel}`);
      v.slice(0, 4).forEach((item, i) => {
        lines.push(`${pfx}  [${i + 1}] ${objectToLines(item, 0, lang).join(' ').slice(0, 140)}`);
      });
      if (v.length > 4) {
        lines.push(`${pfx}  ${ru ? `… и ещё ${v.length - 4}` : `… and ${v.length - 4} more`}`);
      }
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      lines.push(`${pfx}• ${capitalized}:`);
      lines.push(...objectToLines(v, depth + 1, lang));
    } else {
      lines.push(`${pfx}• ${capitalized}: ${formatVal(v, k, lang)}`);
    }
  }
  return lines;
}

function sentenceFragment(obj, maxFields = 6, lang = 'en') {
  const ru = isRuLang(lang);
  const entries = Object.entries(obj || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .slice(0, maxFields);

  if (entries.length === 0) return ru ? 'нет данных' : 'no data';

  const parts = entries.map(([key, value]) => {
    const label = formatKey(key, lang);
    const ctx = detectContext(key);
    if (ctx === 'sensitive') return ru ? `${label} скрыт(о)` : `${label} is hidden`;
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return ru
          ? `${label} содержит ${value.length} ${pluralRuWords(value.length, ['элемент', 'элемента', 'элементов'])}`
          : `${label} has ${value.length} item${value.length !== 1 ? 's' : ''}`;
      }
      return ru ? `${label} — объект` : `${label} is an object`;
    }
    const val = formatVal(value, key, lang);
    return ru ? `${label}: ${val}` : `${label} is ${val}`;
  });

  if (parts.length === 1) return parts[0];
  const last = parts.pop();
  return ru ? `${parts.join(', ')} и ${last}` : `${parts.join(', ')}, and ${last}`;
}

function engineToSentence(data, sourceFormat = 'json', lang = 'en') {
  const ru = isRuLang(lang);
  const lbl = (sourceFormat || 'data').toUpperCase();
  if (data === null || data === undefined) return ru ? 'Значение пусто.' : 'The value is empty.';
  if (typeof data !== 'object') return ru ? `Этот ${lbl} содержит: ${formatVal(data, '', lang)}.` : `This ${lbl} contains: ${formatVal(data, '', lang)}.`;
  if (Array.isArray(data)) {
    if (data.length === 0) return ru ? `Этот ${lbl} содержит пустой список.` : `This ${lbl} contains an empty list.`;
    return ru
      ? `Этот ${lbl} содержит список из ${data.length} ${pluralRuWords(data.length, ['записи', 'записей', 'записей'])}.`
      : `This ${lbl} lists ${data.length} record${data.length !== 1 ? 's' : ''}.`;
  }
  const frag = sentenceFragment(data, 8, lang);
  return ru
    ? `Этот ${lbl} описывает запись, где ${frag}.`
    : `This ${lbl} describes a record where ${frag}.`;
}

function engineToProse(data, sourceFormat = 'json', lang = 'en') {
  const ru = isRuLang(lang);
  const lbl = (sourceFormat || 'data').toUpperCase();
  if (data === null || data === undefined) return ru ? 'Значение отсутствует (пусто).' : 'The value is empty.';
  if (typeof data !== 'object' || Array.isArray(data)) return engineToSentence(data, sourceFormat, lang);

  const keys = Object.keys(data);
  const p1 = ru
    ? `Этот ${lbl} содержит структурированные данные из ${keys.length} ${pluralRuWords(keys.length, ['поля', 'полей', 'полей'])}.`
    : `This ${lbl} contains structured data with ${keys.length} field${keys.length !== 1 ? 's' : ''}.`;

  const scalars = Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v !== 'object' && v !== null && v !== undefined));
  const nested = Object.entries(data).filter(([, v]) => typeof v === 'object' && v !== null);

  const paragraphs = [p1];
  if (Object.keys(scalars).length > 0) {
    const frag = sentenceFragment(scalars, 8, lang);
    paragraphs.push(ru ? `В записи указано, что ${frag}.` : `It records that ${frag}.`);
  }

  if (nested.length > 0) {
    const nestedParts = nested.slice(0, 4).map(([k, v]) => {
      const label = formatKey(k, lang);
      if (Array.isArray(v)) {
        return ru
          ? `Раздел «${label}» содержит список из ${v.length} ${pluralRuWords(v.length, ['элемента', 'элементов', 'элементов'])}.`
          : `The "${label}" section contains a collection of ${v.length} item${v.length !== 1 ? 's' : ''}.`;
      }
      return ru
        ? `Вложенный блок «${label}» включает в себя: ${sentenceFragment(v, 6, lang)}.`
        : `The nested block "${label}" includes: ${sentenceFragment(v, 6, lang)}.`;
    });
    paragraphs.push(nestedParts.join(' '));
  }
  return paragraphs.join('\n\n');
}

function engineToStory(data, sourceFormat = 'json', lang = 'en') {
  const ru = isRuLang(lang);
  const lbl = (sourceFormat || 'data').toUpperCase();

  if (data === null || data === undefined) return ru ? 'Это короткая история о пустоте: данных нет.' : 'This is a brief story of emptiness: no data was provided.';
  if (typeof data !== 'object') {
    return ru
      ? `История одного значения: перед нами одиночный элемент со значением ${formatVal(data, '', lang)}.`
      : `The story of a single value: here stands an individual entry with value ${formatVal(data, '', lang)}.`;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return ru ? 'Это история о пустом списке, ожидающем своих первых записей.' : 'This is a story of an empty collection waiting for its first entries.';
    const countStr = `${data.length} ${ru ? pluralRuWords(data.length, ['записи', 'записей', 'записей']) : `record${data.length !== 1 ? 's' : ''}`}`;
    const p1 = ru ? `Перед нами разворачивается хроника из ${countStr}.` : `Here unfolds a chronicle gathering ${countStr}.`;
    const sampleStories = data.slice(0, 3).map((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        return ru ? `Эпизод ${idx + 1}: ${sentenceFragment(item, 5, lang)}.` : `Episode ${idx + 1}: ${sentenceFragment(item, 5, lang)}.`;
      }
      return ru ? `Элемент ${idx + 1}: ${formatVal(item, '', lang)}.` : `Item ${idx + 1}: ${formatVal(item, '', lang)}.`;
    });
    const remainder = data.length - sampleStories.length;
    const remStr = remainder > 0
      ? (ru ? ` Далее хроника продолжается ещё ${remainder} ${pluralRuWords(remainder, ['записью', 'записями', 'записями'])}.` : ` The chronicle proceeds further with ${remainder} more record${remainder !== 1 ? 's' : ''}.`)
      : '';
    return `${p1}\n\n${sampleStories.join(' ')}${remStr}`;
  }

  const keys = Object.keys(data);
  if (keys.length === 0) return ru ? 'Перед нами пустая запись без единого поля.' : 'Here lies an empty record with no fields recorded.';

  if ('error' in data || 'errors' in data) {
    const errObj = typeof data.error === 'object' && data.error !== null ? data.error : data;
    const code = errObj.code || errObj.status || data.code;
    const msg = errObj.message || errObj.msg || data.message || (typeof data.error === 'string' ? data.error : '');
    const details = errObj.details || errObj.detail || data.details;
    const ts = data.timestamp || errObj.timestamp || data.time;
    const parts = [];
    if (ru) {
      parts.push(`В системе произошел инцидент: зафиксирована ошибка${code ? ` с кодом ${code}` : ''}.`);
      if (msg) parts.push(`Сообщение системы: «${msg}».`);
      if (details) parts.push(`Подробности: ${details}.`);
      if (ts) parts.push(`Событие произошло ${formatVal(ts, 'timestamp', lang)}.`);
    } else {
      parts.push(`A system incident occurred: error${code ? ` with code ${code}` : ''}.`);
      if (msg) parts.push(`Reported message: "${msg}".`);
      if (details) parts.push(`Details: ${details}.`);
      if (ts) parts.push(`Logged on ${formatVal(ts, 'timestamp', lang)}.`);
    }
    return parts.join(' ');
  }

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
  const subjectName = nameKey ? String(data[nameKey]) : '';
  const idVal = idKey ? String(data[idKey]) : '';

  if (subjectName && idVal) {
    sentences.push(ru ? `Это история о ${subjectName} (${formatKey(idKey, lang)}: ${idVal}).` : `This is the story of ${subjectName} (${formatKey(idKey, lang)}: ${idVal}).`);
  } else if (subjectName) {
    sentences.push(ru ? `Перед нами история о ${subjectName}.` : `This is the story of ${subjectName}.`);
  } else if (idVal) {
    sentences.push(ru ? `Перед нами запись объекта с идентификатором ${idVal}.` : `This record represents an entity identified as ${idVal}.`);
  } else {
    sentences.push(ru ? `Перед нами история одного структурированного объекта.` : `Here is the story told by this data object.`);
  }

  if (ageKey && typeof data[ageKey] === 'number') {
    sentences.push(ru ? `Возраст составляет ${data[ageKey]} ${pluralRuWords(data[ageKey], ['год', 'года', 'лет'])}.` : `Currently ${data[ageKey]} years old.`);
  }

  if (createdKey && data[createdKey]) {
    const cTime = formatVal(data[createdKey], createdKey, lang);
    if (updatedKey && data[updatedKey]) {
      const uTime = formatVal(data[updatedKey], updatedKey, lang);
      sentences.push(ru
        ? `История началась ${cTime}, а последнее обновление было зафиксировано ${uTime}.`
        : `The journey began on ${cTime}, with the latest activity noted on ${uTime}.`);
    } else {
      sentences.push(ru ? `Событие или регистрация датируется ${cTime}.` : `Originated on ${cTime}.`);
    }
  } else if (updatedKey && data[updatedKey]) {
    sentences.push(ru ? `Последняя активность зафиксирована ${formatVal(data[updatedKey], updatedKey, lang)}.` : `Most recent activity occurred on ${formatVal(data[updatedKey], updatedKey, lang)}.`);
  }

  if (statusKey && data[statusKey]) {
    sentences.push(ru ? `Текущий статус — ${formatVal(data[statusKey], statusKey, lang)}.` : `The operational status stands as ${formatVal(data[statusKey], statusKey, lang)}.`);
  }
  if (activeKey && typeof data[activeKey] === 'boolean') {
    if (ru) sentences.push(data[activeKey] ? 'Запись активна и находится в рабочем состоянии.' : 'Запись в данный момент неактивна.');
    else sentences.push(data[activeKey] ? 'The profile is currently active.' : 'The profile is currently inactive.');
  }

  if (moneyKey && data[moneyKey] !== undefined) {
    sentences.push(ru ? `Показатель ${formatKey(moneyKey, lang)} составляет ${formatVal(data[moneyKey], moneyKey, lang)}.` : `The recorded ${formatKey(moneyKey, lang)} equals ${formatVal(data[moneyKey], moneyKey, lang)}.`);
  }
  if (ratingKey && data[ratingKey] !== undefined) {
    sentences.push(ru ? `Рейтинг оценивается как ${formatVal(data[ratingKey], ratingKey, lang)}.` : `The rating is evaluated at ${formatVal(data[ratingKey], ratingKey, lang)}.`);
  }

  const contactParts = [];
  if (emailKey && data[emailKey]) contactParts.push(ru ? `эл. почта ${data[emailKey]}` : `email at ${data[emailKey]}`);
  if (phoneKey && data[phoneKey]) contactParts.push(ru ? `телефон ${data[phoneKey]}` : `phone at ${data[phoneKey]}`);
  if (contactParts.length) {
    sentences.push(ru ? `Для связи используется: ${contactParts.join(', ')}.` : `Contact channels include: ${contactParts.join(', ')}.`);
  }

  if ((cityKey && data[cityKey]) || (countryKey && data[countryKey])) {
    const loc = [data[cityKey], data[countryKey]].filter(Boolean).join(', ');
    sentences.push(ru ? `Географическое расположение: ${loc}.` : `Located in ${loc}.`);
  }

  if (tagsKey && Array.isArray(data[tagsKey]) && data[tagsKey].length) {
    sentences.push(ru ? `С объектом связаны метки: ${data[tagsKey].join(', ')}.` : `Associated with tags: ${data[tagsKey].join(', ')}.`);
  }

  const handled = new Set([nameKey, idKey, createdKey, updatedKey, statusKey, activeKey, emailKey, phoneKey, cityKey, countryKey, moneyKey, tagsKey, ageKey, ratingKey]);
  const remScalars = keys.filter(k => !handled.has(k) && typeof data[k] !== 'object' && data[k] !== null && data[k] !== undefined);
  if (remScalars.length > 0) {
    const frag = remScalars.slice(0, 5).map(k => `${formatKey(k, lang)}: ${formatVal(data[k], k, lang)}`).join(', ');
    sentences.push(ru ? `Среди других характеристик: ${frag}.` : `Additional attributes include: ${frag}.`);
  }

  const remNested = keys.filter(k => !handled.has(k) && typeof data[k] === 'object' && data[k] !== null);
  if (remNested.length > 0) {
    const descriptions = remNested.slice(0, 3).map(k => {
      const v = data[k];
      if (Array.isArray(v)) return `${formatKey(k, lang)} (${v.length} ${ru ? pluralRuWords(v.length, ['эл.', 'эл.', 'эл.']) : 'items'})`;
      return `${formatKey(k, lang)} (${sentenceFragment(v, 3, lang)})`;
    }).join('; ');
    sentences.push(ru ? `В структуре содержатся разделы: ${descriptions}.` : `The structure also contains sections: ${descriptions}.`);
  }

  return sentences.join(' ');
}

function humanizeEngine(data, sourceFormat = 'json', outFmt = 'plain', mode = 'structured', lang = 'en') {
  const ru = isRuLang(lang);
  const lbl = (sourceFormat || 'data').toUpperCase();

  let text = '';
  if (mode === 'story') {
    text = engineToStory(data, sourceFormat, lang);
  } else if (mode === 'prose') {
    text = engineToProse(data, sourceFormat, lang);
  } else if (mode === 'sentence' || outFmt === 'sentence') {
    text = engineToSentence(data, sourceFormat, lang);
  } else {
    // Default: structured mode
    let intro = '';
    let body = '';

    if (Array.isArray(data)) {
      intro = ru
        ? `Этот ${lbl} содержит список из ${data.length} ${pluralRuWords(data.length, ['записи', 'записей', 'записей'])}.`
        : `This ${lbl} contains a list of ${data.length} record${data.length !== 1 ? 's' : ''}.`;

      const limit = Math.min(data.length, 15);
      const lines = [];
      for (let i = 0; i < limit; i++) {
        if (typeof data[i] === 'object' && data[i] !== null) {
          lines.push(`\n${ru ? 'Запись' : 'Record'} ${i + 1}:\n${objectToLines(data[i], 1, lang).join('\n')}`);
        } else {
          lines.push(`\n${ru ? 'Элемент' : 'Item'} ${i + 1}: ${formatVal(data[i], '', lang)}`);
        }
      }
      if (data.length > 15) {
        lines.push(`\n${ru ? `… и ещё ${data.length - 15} записей` : `… and ${data.length - 15} more records`}`);
      }
      body = lines.join('');
    } else if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      if ('error' in data || 'errors' in data) {
        intro = ru ? `Этот ${lbl} описывает ошибку или сбой.` : `This ${lbl} describes an error or failure response.`;
      } else if ('data' in data && ('meta' in data || 'links' in data)) {
        intro = ru ? `Этот ${lbl} является ответом API с данными и метаданными.` : `This ${lbl} is an API response with data and metadata.`;
      } else {
        intro = ru
          ? `Этот ${lbl} содержит структурированный объект из ${keys.length} ${pluralRuWords(keys.length, ['поля', 'полей', 'полей'])}.`
          : `This ${lbl} contains a structured object with ${keys.length} field${keys.length !== 1 ? 's' : ''}.`;
      }
      body = '\n' + objectToLines(data, 0, lang).join('\n');
    } else {
      return ru ? `Этот ${lbl} содержит одно значение: ${data}` : `This ${lbl} contains a single value: ${data}`;
    }

    text = `${intro}\n${body}`;
  }

  if (outFmt === 'markdown') {
    return ru
      ? `# Анализ ${lbl}\n\n## Сводка\n\n${text}\n\n---\n*Обработано json-humanized*`
      : `# ${lbl} Analysis\n\n## Summary\n\n${text}\n\n---\n*Processed by json-humanized*`;
  }
  if (outFmt === 'story') {
    const header = ru ? `  📖  ИСТОРИЯ ДАННЫХ (${lbl})` : `  📖  THE ${lbl} STORY`;
    return `${'━'.repeat(50)}\n${header}\n${'━'.repeat(50)}\n\n${text}\n\n${'━'.repeat(50)}`;
  }
  if (outFmt === 'html') {
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    return `<article class="jh-output"><h2>${lbl} Summary</h2><div>${esc(text).replace(/\n/g, '<br>\n')}</div></article>`;
  }
  if (outFmt === 'csv') {
    return `format=${sourceFormat},lang=${lang},humanized="${text.replace(/"/g, '""')}"`;
  }

  return text;
}

// Minimal TOML Parser for browser
function parseBrowserTOML(text) {
  const root = {};
  let cur = root;
  const lines = text.split('\n');
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const arrMatch = line.match(/^\[\[(.+)\]\]$/);
    if (arrMatch) {
      const parts = arrMatch[1].trim().split('.');
      let obj = root;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!obj[parts[i]]) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      const last = parts[parts.length - 1];
      if (!Array.isArray(obj[last])) obj[last] = [];
      const newEntry = {};
      obj[last].push(newEntry);
      cur = newEntry;
      continue;
    }
    const secMatch = line.match(/^\[(.+)\]$/);
    if (secMatch) {
      const parts = secMatch[1].trim().split('.');
      cur = root;
      for (const p of parts) {
        if (!cur[p]) cur[p] = {};
        cur = cur[p];
      }
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx < 0) continue;
    const k = line.slice(0, eqIdx).trim();
    const v = line.slice(eqIdx + 1).trim();
    let parsedVal = v;
    if (v === 'true') parsedVal = true;
    else if (v === 'false') parsedVal = false;
    else if (/^-?\d+\.\d+$/.test(v)) parsedVal = parseFloat(v);
    else if (/^-?\d+$/.test(v)) parsedVal = parseInt(v, 10);
    else if (v.startsWith('"') && v.endsWith('"')) parsedVal = v.slice(1, -1);
    cur[k] = parsedVal;
  }
  return root;
}

// Browser parse wrapper
function parseBrowserData(text, fmt = 'json') {
  if (fmt === 'yaml') {
    if (typeof jsyaml !== 'undefined') return jsyaml.load(text);
    throw new Error('YAML parser (js-yaml) not loaded');
  }
  if (fmt === 'toml') {
    return parseBrowserTOML(text);
  }
  return JSON.parse(text);
}

// Client-side Diff
function diffBrowserData(a, b, lang = 'en') {
  const ru = isRuLang(lang);
  const changes = [];
  const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);

  for (const k of allKeys) {
    const label = formatKey(k, lang);
    if (!(k in a)) {
      changes.push(ru ? `➕ Добавлено ${label}: ${formatVal(b[k], k, lang)}` : `➕ Added ${label}: ${formatVal(b[k], k, lang)}`);
    } else if (!(k in b)) {
      changes.push(ru ? `➖ Удалено ${label} (было: ${formatVal(a[k], k, lang)})` : `➖ Removed ${label} (was: ${formatVal(a[k], k, lang)})`);
    } else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
      changes.push(ru
        ? `✏ Изменено ${label}: ${formatVal(a[k], k, lang)} → ${formatVal(b[k], k, lang)}`
        : `✏ Changed ${label}: ${formatVal(a[k], k, lang)} → ${formatVal(b[k], k, lang)}`);
    }
  }

  if (changes.length === 0) {
    return ru ? '✅ Различий не обнаружено — оба значения абсолютно одинаковы.' : '✅ No differences found — both values are identical.';
  }

  return (ru ? `Найдено ${changes.length} различий:\n\n` : `Found ${changes.length} difference(s):\n\n`) + changes.join('\n');
}

// Export for extension / scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { humanizeEngine, parseBrowserData, diffBrowserData, formatKey, formatVal };
}
