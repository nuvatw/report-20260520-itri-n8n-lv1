import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const outputDir = path.resolve("artifacts/fin-consumption");

const googleDocument = {
  __rl: true,
  value: "={{ $env.FIN_SPREADSHEET_ID }}",
  mode: "id",
};

function sheetName(name) {
  return {
    __rl: true,
    value: name,
    mode: "name",
    cachedResultName: name,
  };
}

function nodeBase(name, type, typeVersion, position, parameters = {}) {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    typeVersion,
    position,
    parameters,
  };
}

function lineHeaders() {
  return {
    parameters: [
      { name: "Content-Type", value: "application/json" },
      { name: "Authorization", value: "=Bearer {{ $env.LINE_CHANNEL_ACCESS_TOKEN }}" },
    ],
  };
}

function openAiHeaders() {
  return {
    parameters: [
      { name: "Content-Type", value: "application/json" },
      { name: "Authorization", value: "=Bearer {{ $env.OPENAI_API_KEY }}" },
    ],
  };
}

function notionHeaders() {
  return {
    parameters: [
      { name: "Authorization", value: "=Bearer {{ $env.NOTION_API_KEY }}" },
      { name: "Content-Type", value: "application/json" },
      { name: "Notion-Version", value: "2022-06-28" },
    ],
  };
}

function schemaFor(columns, removed = []) {
  return columns.map((column) => ({
    id: column,
    displayName: column,
    required: false,
    defaultMatch: false,
    display: true,
    type: column === "row_number" || column.includes("amount") || column === "消費金額" || column === "import_count" ? "number" : "string",
    canBeUsedToMatch: true,
    ...(column === "row_number" ? { readOnly: true } : {}),
    ...(removed.includes(column) ? { removed: true } : {}),
  }));
}

function googleSheetsRead(name, position, targetSheet, filters = undefined) {
  return {
    ...nodeBase(name, "n8n-nodes-base.googleSheets", 4.7, position, {
      documentId: googleDocument,
      sheetName: sheetName(targetSheet),
      ...(filters ? { filtersUI: { values: filters } } : {}),
      options: {},
    }),
    alwaysOutputData: true,
    credentials: {
      googleSheetsOAuth2Api: {
        id: "REPLACE_WITH_GOOGLE_SHEETS_CREDENTIAL_ID",
        name: "Google Sheets OAuth2",
      },
    },
  };
}

function googleSheetsAppend(name, position, targetSheet, values, columns) {
  return {
    ...nodeBase(name, "n8n-nodes-base.googleSheets", 4.7, position, {
      operation: "append",
      documentId: googleDocument,
      sheetName: sheetName(targetSheet),
      columns: {
        mappingMode: "defineBelow",
        value: values,
        matchingColumns: [],
        schema: schemaFor(columns),
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
      options: {},
    }),
    credentials: {
      googleSheetsOAuth2Api: {
        id: "REPLACE_WITH_GOOGLE_SHEETS_CREDENTIAL_ID",
        name: "Google Sheets OAuth2",
      },
    },
  };
}

function googleSheetsUpdate(name, position, targetSheet, values, columns) {
  return {
    ...nodeBase(name, "n8n-nodes-base.googleSheets", 4.7, position, {
      operation: "update",
      documentId: googleDocument,
      sheetName: sheetName(targetSheet),
      columns: {
        mappingMode: "defineBelow",
        value: values,
        matchingColumns: ["row_number"],
        schema: schemaFor(columns),
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
      options: {},
    }),
    credentials: {
      googleSheetsOAuth2Api: {
        id: "REPLACE_WITH_GOOGLE_SHEETS_CREDENTIAL_ID",
        name: "Google Sheets OAuth2",
      },
    },
  };
}

function flexBubble({ eyebrow, badge, title, body, cards = [], button }) {
  const cardBoxes = cards.map((card) => ({
    type: "box",
    layout: "vertical",
    contents: [
      {
        type: "text",
        text: card.label,
        size: "xs",
        color: "#2563EB",
        wrap: true,
        weight: "bold",
      },
      {
        type: "text",
        text: card.value,
        size: "sm",
        color: "#13213F",
        wrap: true,
        weight: "bold",
        margin: "xs",
      },
    ],
    backgroundColor: "#FDFEFF",
    borderColor: "#D7E3F4",
    borderWidth: "light",
    cornerRadius: "md",
    paddingAll: "12px",
  }));

  const contents = [
    {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: eyebrow,
              size: "xs",
              color: "#C9DAFF",
              wrap: true,
              weight: "bold",
              flex: 1,
            },
            {
              type: "text",
              text: badge,
              size: "xs",
              color: "#F4F8FF",
              wrap: true,
              weight: "bold",
              align: "end",
              flex: 1,
            },
          ],
        },
        {
          type: "text",
          text: title,
          size: "xl",
          color: "#F4F8FF",
          wrap: true,
          weight: "bold",
          margin: "md",
        },
        {
          type: "text",
          text: body,
          size: "sm",
          color: "#C9DAFF",
          wrap: true,
          margin: "sm",
        },
      ],
      backgroundColor: "#102A5F",
      paddingAll: "20px",
    },
    {
      type: "box",
      layout: "vertical",
      contents: cardBoxes,
      paddingAll: "20px",
      spacing: "sm",
      backgroundColor: "#F7FAFF",
    },
  ];

  if (button) {
    contents.push({
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      paddingTop: "0px",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          action: {
            type: "message",
            label: button.label,
            text: button.text,
          },
          color: "#102A5F",
        },
      ],
      backgroundColor: "#F7FAFF",
    });
  }

  return {
    type: "bubble",
    size: "mega",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "0px",
      backgroundColor: "#F7FAFF",
      contents,
    },
    styles: {
      body: {
        backgroundColor: "#F7FAFF",
      },
    },
  };
}

function lineReplyNode(name, position, altText, bubbleExpressionOrObject) {
  const contents = typeof bubbleExpressionOrObject === "string" ? bubbleExpressionOrObject : JSON.stringify(bubbleExpressionOrObject, null, 2);
  return nodeBase(name, "n8n-nodes-base.httpRequest", 4.4, position, {
    method: "POST",
    url: "https://api.line.me/v2/bot/message/reply",
    sendHeaders: true,
    headerParameters: lineHeaders(),
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={
  "replyToken": "{{ $('Normalize LINE Event').item.json.reply_token || $('Build Import Summary').item.json.reply_token }}",
  "messages": [
    {
      "type": "flex",
      "altText": "${altText}",
      "contents": ${contents}
    }
  ],
  "notificationDisabled": false
}`,
    options: {},
  });
}

const sessionColumns = [
  "session_id",
  "line_user_id",
  "image_message_id",
  "session_state",
  "image_source",
  "created_at",
  "description_received_at",
  "analysis_completed_at",
  "user_description",
  "ai_model",
  "ai_response_id",
  "import_count",
  "total_amount",
  "failed_reason",
  "row_number",
];

const rawLogColumns = [
  "session_id",
  "line_user_id",
  "image_message_id",
  "user_description",
  "ai_model",
  "ai_response_id",
  "ai_status",
  "raw_response_json",
  "created_at",
];

const expenseColumns = [
  "session_id",
  "expense_index",
  "line_user_id",
  "image_message_id",
  "品項",
  "代墊狀態",
  "公司代墊",
  "對象",
  "歸屬年份",
  "歸屬月份",
  "消費日期",
  "消費金額",
  "幣別",
  "發票狀態",
  "開銷說明",
  "類別",
  "類別是否新增",
  "信心分數",
  "需要人工確認",
  "原始文字",
  "ai_batch_summary",
  "notion_page_id",
  "created_at",
];

const nodes = [
  nodeBase("Webhook - LINE FIN", "n8n-nodes-base.webhook", 2.1, [-3200, 260], {
    httpMethod: "POST",
    path: "nuvao-fin-consumption",
    options: {},
  }),
  nodeBase("line_loading_animation", "n8n-nodes-base.httpRequest", 4.4, [-2960, 260], {
    method: "POST",
    url: "https://api.line.me/v2/bot/chat/loading/start",
    sendHeaders: true,
    headerParameters: lineHeaders(),
    sendBody: true,
    specifyBody: "json",
    jsonBody: `={
  "chatId": "{{ $('Webhook - LINE FIN').item.json.body.events[0].source.userId }}",
  "loadingSeconds": 10
}`,
    options: {},
  }),
  nodeBase("Normalize LINE Event", "n8n-nodes-base.set", 3.4, [-2720, 260], {
    assignments: {
      assignments: [
        { id: crypto.randomUUID(), name: "line_user_id", value: "={{ $('Webhook - LINE FIN').item.json.body.events[0].source.userId }}", type: "string" },
        { id: crypto.randomUUID(), name: "reply_token", value: "={{ $('Webhook - LINE FIN').item.json.body.events[0].replyToken }}", type: "string" },
        { id: crypto.randomUUID(), name: "message_type", value: "={{ $('Webhook - LINE FIN').item.json.body.events[0].message.type }}", type: "string" },
        { id: crypto.randomUUID(), name: "image_message_id", value: "={{ $('Webhook - LINE FIN').item.json.body.events[0].message.type === 'image' ? $('Webhook - LINE FIN').item.json.body.events[0].message.id : '' }}", type: "string" },
        { id: crypto.randomUUID(), name: "line_text", value: "={{ $('Webhook - LINE FIN').item.json.body.events[0].message.type === 'text' ? $('Webhook - LINE FIN').item.json.body.events[0].message.text : '' }}", type: "string" },
        { id: crypto.randomUUID(), name: "created_at", value: "={{ $now.format('yyyy-MM-dd HH:mm') }}", type: "string" },
      ],
    },
    options: {},
  }),
  nodeBase("Route message type", "n8n-nodes-base.switch", 3.4, [-2480, 260], {
    rules: {
      values: [
        {
          conditions: {
            options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
            conditions: [
              { id: crypto.randomUUID(), leftValue: "={{ $json.message_type }}", rightValue: "image", operator: { type: "string", operation: "equals" } },
            ],
            combinator: "and",
          },
          renameOutput: true,
          outputKey: "圖片",
        },
        {
          conditions: {
            options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
            conditions: [
              { id: crypto.randomUUID(), leftValue: "={{ $json.message_type }}", rightValue: "text", operator: { type: "string", operation: "equals" } },
            ],
            combinator: "and",
          },
          renameOutput: true,
          outputKey: "文字說明",
        },
        {
          conditions: {
            options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
            conditions: [
              { id: crypto.randomUUID(), leftValue: "={{ $json.message_type }}", rightValue: "image", operator: { type: "string", operation: "notEquals" } },
              { id: crypto.randomUUID(), leftValue: "={{ $json.message_type }}", rightValue: "text", operator: { type: "string", operation: "notEquals" } },
            ],
            combinator: "and",
          },
          renameOutput: true,
          outputKey: "其他",
        },
      ],
    },
    options: {},
  }),
  nodeBase("Prepare image session", "n8n-nodes-base.set", 3.4, [-2240, -40], {
    assignments: {
      assignments: [
        { id: crypto.randomUUID(), name: "session_id", value: "={{ 'FIN-' + $now.format('yyyyMMddHHmmss') + '-' + $json.image_message_id.slice(-6) }}", type: "string" },
        { id: crypto.randomUUID(), name: "line_user_id", value: "={{ $json.line_user_id }}", type: "string" },
        { id: crypto.randomUUID(), name: "image_message_id", value: "={{ $json.image_message_id }}", type: "string" },
        { id: crypto.randomUUID(), name: "session_state", value: "creating", type: "string" },
        { id: crypto.randomUUID(), name: "image_source", value: "LINE", type: "string" },
        { id: crypto.randomUUID(), name: "created_at", value: "={{ $json.created_at }}", type: "string" },
        { id: crypto.randomUUID(), name: "ai_model", value: "={{ $env.OPENAI_FIN_MODEL || 'gpt-5.4-mini' }}", type: "string" },
      ],
    },
    options: {},
  }),
  googleSheetsAppend("Append image session", [-2000, -40], "fin_image_sessions", {
    session_id: "={{ $json.session_id }}",
    line_user_id: "={{ $json.line_user_id }}",
    image_message_id: "={{ $json.image_message_id }}",
    session_state: "creating",
    image_source: "LINE",
    created_at: "={{ $json.created_at }}",
    ai_model: "={{ $json.ai_model }}",
    import_count: 0,
    total_amount: 0,
  }, sessionColumns),
  lineReplyNode(
    "Reply ask expense context",
    [-1760, -40],
    "FIN 消費圖片已收到",
    flexBubble({
      eyebrow: "nuvaO FIN",
      badge: "creating",
      title: "已收到消費截圖",
      body: "我已記住這張圖片。請直接回覆這張截圖裡每筆信用卡消費的補充說明，AI 會一起分析並批量匯入。",
      cards: [
        { label: "圖片 ID", value: "{{ $('Prepare image session').item.json.image_message_id }}" },
        { label: "下一步", value: "回覆商家、用途、哪幾筆要入帳，以及特殊代墊規則" },
      ],
    }),
  ),
  googleSheetsRead("Get all FIN sessions", [-2240, 300], "fin_image_sessions"),
  nodeBase("Find latest creating session", "n8n-nodes-base.code", 2, [-2000, 300], {
    jsCode: `const event = $('Normalize LINE Event').first().json;
const rows = $input.all()
  .map((item) => item.json)
  .filter((row) => row.session_id && row.line_user_id === event.line_user_id && row.session_state === 'creating');

rows.sort((a, b) => {
  const aRow = Number(a.row_number || 0);
  const bRow = Number(b.row_number || 0);
  return bRow - aRow;
});

if (rows.length === 0) {
  return [{ json: { ...event, has_creating_session: 'no' } }];
}

return [{
  json: {
    ...event,
    ...rows[0],
    user_description: event.line_text,
    has_creating_session: 'yes',
  },
}];`,
  }),
  nodeBase("If creating session exists", "n8n-nodes-base.if", 2.3, [-1760, 300], {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 3 },
      conditions: [
        { id: crypto.randomUUID(), leftValue: "={{ $json.has_creating_session }}", rightValue: "yes", operator: { type: "string", operation: "equals" } },
      ],
      combinator: "and",
    },
    options: {},
  }),
  lineReplyNode(
    "Reply ask image first",
    [-1520, 480],
    "請先上傳消費圖片",
    flexBubble({
      eyebrow: "nuvaO FIN",
      badge: "需要圖片",
      title: "請先上傳消費截圖",
      body: "我目前沒有找到 creating 狀態的圖片。請先傳信用卡或支付紀錄截圖，再回覆補充說明。",
      cards: [
        { label: "流程順序", value: "1. 傳圖片  2. 補充說明  3. AI 批量匯入" },
      ],
    }),
  ),
  googleSheetsUpdate("Update session context", [-1520, 200], "fin_image_sessions", {
    row_number: "={{ $json.row_number }}",
    session_state: "analyzing",
    user_description: "={{ $json.user_description }}",
    description_received_at: "={{ $now.format('yyyy-MM-dd HH:mm') }}",
  }, sessionColumns),
  googleSheetsRead("Get active categories", [-1280, 200], "fin_categories"),
  nodeBase("Aggregate categories with session", "n8n-nodes-base.code", 2, [-1040, 200], {
    jsCode: `const session = $('Find latest creating session').first().json;
const categoryRows = $input.all()
  .map((item) => item.json)
  .filter((row) => row.category_name && String(row.active ?? 'TRUE').toUpperCase() !== 'FALSE');

const fallback = [
  { category_key: 'food', category_name: '飲食', ai_hint: '餐廳、外送、飲料、聚餐、咖啡' },
  { category_key: 'transport', category_name: '交通', ai_hint: 'Uber、計程車、捷運、高鐵、停車、油資' },
  { category_key: 'other', category_name: '其他', ai_hint: '無法歸入既有類別的公司支出' },
];

const categories = categoryRows.length > 0 ? categoryRows : fallback;

return [{
  json: {
    ...session,
    categories,
    category_list: categories.map((category) => category.category_name || category.notion_option_name).join('、'),
  },
}];`,
  }),
  nodeBase("Download LINE image", "n8n-nodes-base.httpRequest", 4.4, [-800, 200], {
    url: "=https://api-data.line.me/v2/bot/message/{{ $json.image_message_id }}/content",
    sendHeaders: true,
    headerParameters: lineHeaders(),
    options: {
      response: {
        response: {
          responseFormat: "file",
          outputPropertyName: "line_image",
        },
      },
    },
  }),
  nodeBase("Build OpenAI Payload", "n8n-nodes-base.code", 2, [-560, 200], {
    jsCode: `const item = $input.first();
const session = item.json;
const imageBuffer = await this.helpers.getBinaryDataBuffer(0, 'line_image');
const mimeType = item.binary?.line_image?.mimeType || 'image/jpeg';
const imageBase64 = imageBuffer.toString('base64');
const categories = Array.isArray(session.categories) && session.categories.length > 0
  ? session.categories
  : [{ category_name: '飲食' }, { category_name: '交通' }, { category_name: '其他' }];

const categoryText = categories
  .map((category) => {
    const name = category.category_name || category.notion_option_name || category.category_key;
    const hint = category.ai_hint ? \`：\${category.ai_hint}\` : '';
    return \`- \${name}\${hint}\`;
  })
  .join('\\n');

const instructions = \`你是 nuvaO FIN 消費分析助手。請根據信用卡/支付截圖和使用者補充說明，整理成可批量匯入 Notion 的 JSON。

規則：
1. 一張圖片可能有多筆消費，請輸出 expenses 陣列。
2. 欄位名稱必須完全使用 schema 的中文欄位。
3. 如果使用者沒有特別說明，預設「公司代墊」為「是」，「代墊狀態」為「代墊中」，「發票狀態」為「尚未提供」。
4. 消費金額請輸出純數字，不要包含 NT$、逗號或幣別。
5. 歸屬月份格式使用 YYYY/MM。若截圖與說明沒有歸屬月份，使用消費日期所在月份。
6. 類別優先使用既有類別，但如果真的不適合，可以新增更精準的類別，並將「類別是否新增」設為 true。
7. 如果看不清楚或資訊矛盾，仍要輸出最保守的結果，並把「需要人工確認」設為 true。

目前可編輯類別：
\${categoryText}

使用者補充說明：
\${session.user_description || '(未提供補充說明)'}\`;

const payload = {
  model: session.ai_model || $env.OPENAI_FIN_MODEL || 'gpt-5.4-mini',
  input: [
    {
      role: 'user',
      content: [
        { type: 'input_text', text: instructions },
        {
          type: 'input_image',
          image_url: \`data:\${mimeType};base64,\${imageBase64}\`,
          detail: 'high',
        },
      ],
    },
  ],
  text: {
    format: {
      type: 'json_schema',
      name: 'fin_expense_batch',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['batch_summary', 'expenses'],
        properties: {
          batch_summary: { type: 'string' },
          expenses: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                '品項',
                '代墊狀態',
                '公司代墊',
                '對象',
                '歸屬年份',
                '歸屬月份',
                '消費日期',
                '消費金額',
                '幣別',
                '發票狀態',
                '開銷說明',
                '類別',
                '類別是否新增',
                '信心分數',
                '需要人工確認',
                '原始文字',
              ],
              properties: {
                '品項': { type: 'string' },
                '代墊狀態': { type: 'string' },
                '公司代墊': { type: 'string' },
                '對象': { type: 'string' },
                '歸屬年份': { type: 'integer' },
                '歸屬月份': { type: 'string' },
                '消費日期': { type: 'string' },
                '消費金額': { type: 'number' },
                '幣別': { type: 'string' },
                '發票狀態': { type: 'string' },
                '開銷說明': { type: 'string' },
                '類別': { type: 'string' },
                '類別是否新增': { type: 'boolean' },
                '信心分數': { type: 'number' },
                '需要人工確認': { type: 'boolean' },
                '原始文字': { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

return [{
  json: {
    ...session,
    image_mime_type: mimeType,
    openai_payload: payload,
  },
}];`,
  }),
  nodeBase("OpenAI - Extract Expense Array", "n8n-nodes-base.httpRequest", 4.4, [-320, 200], {
    method: "POST",
    url: "https://api.openai.com/v1/responses",
    sendHeaders: true,
    headerParameters: openAiHeaders(),
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify($json.openai_payload) }}",
    options: {
      response: {
        response: {
          responseFormat: "json",
        },
      },
    },
  }),
  googleSheetsAppend("Store AI raw log", [-80, 200], "fin_ai_raw_logs", {
    session_id: "={{ $('Build OpenAI Payload').item.json.session_id }}",
    line_user_id: "={{ $('Build OpenAI Payload').item.json.line_user_id }}",
    image_message_id: "={{ $('Build OpenAI Payload').item.json.image_message_id }}",
    user_description: "={{ $('Build OpenAI Payload').item.json.user_description }}",
    ai_model: "={{ $('Build OpenAI Payload').item.json.ai_model }}",
    ai_response_id: "={{ $json.id }}",
    ai_status: "={{ $json.status }}",
    raw_response_json: "={{ JSON.stringify($json) }}",
    created_at: "={{ $now.format('yyyy-MM-dd HH:mm') }}",
  }, rawLogColumns),
  nodeBase("Parse AI Expense Array", "n8n-nodes-base.code", 2, [160, 200], {
    jsCode: `const response = $('OpenAI - Extract Expense Array').first().json;
const session = $('Build OpenAI Payload').first().json;

const outputText = response.output_text
  || response.output?.flatMap((entry) => entry.content || [])
    .find((content) => content.type === 'output_text')?.text
  || '{}';

const parsed = typeof outputText === 'string' ? JSON.parse(outputText) : outputText;
const expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
const now = $now.format('yyyy-MM-dd HH:mm');

return expenses.map((expense, index) => ({
  json: {
    session_id: session.session_id,
    expense_index: index + 1,
    line_user_id: session.line_user_id,
    image_message_id: session.image_message_id,
    user_description: session.user_description,
    ai_batch_summary: parsed.batch_summary || '',
    ai_model: response.model || session.ai_model,
    ai_response_id: response.id || '',
    created_at: now,
    ...expense,
  },
}));`,
  }),
  googleSheetsAppend("Append expense rows", [400, 200], "fin_expense_imports", {
    session_id: "={{ $json.session_id }}",
    expense_index: "={{ $json.expense_index }}",
    line_user_id: "={{ $json.line_user_id }}",
    image_message_id: "={{ $json.image_message_id }}",
    "品項": "={{ $json['品項'] }}",
    "代墊狀態": "={{ $json['代墊狀態'] || '代墊中' }}",
    "公司代墊": "={{ $json['公司代墊'] || '是' }}",
    "對象": "={{ $json['對象'] }}",
    "歸屬年份": "={{ $json['歸屬年份'] }}",
    "歸屬月份": "={{ $json['歸屬月份'] }}",
    "消費日期": "={{ $json['消費日期'] }}",
    "消費金額": "={{ $json['消費金額'] }}",
    "幣別": "={{ $json['幣別'] || 'TWD' }}",
    "發票狀態": "={{ $json['發票狀態'] || '尚未提供' }}",
    "開銷說明": "={{ $json['開銷說明'] }}",
    "類別": "={{ $json['類別'] }}",
    "類別是否新增": "={{ $json['類別是否新增'] }}",
    "信心分數": "={{ $json['信心分數'] }}",
    "需要人工確認": "={{ $json['需要人工確認'] }}",
    "原始文字": "={{ $json['原始文字'] }}",
    ai_batch_summary: "={{ $json.ai_batch_summary }}",
    created_at: "={{ $json.created_at }}",
  }, expenseColumns),
  nodeBase("Build Notion Payload", "n8n-nodes-base.code", 2, [640, 200], {
    jsCode: `const expense = $json;
const text = (value, max = 1800) => String(value ?? '').slice(0, max);
const select = (value, fallback) => ({ select: { name: text(value || fallback, 100) } });
const richText = (value) => ({ rich_text: [{ text: { content: text(value) } }] });

const payload = {
  parent: {
    database_id: $env.NOTION_FIN_DATABASE_ID,
  },
  properties: {
    '品項': {
      title: [
        {
          text: {
            content: text(expense['品項'] || '未命名消費', 200),
          },
        },
      ],
    },
    '代墊狀態': select(expense['代墊狀態'], '代墊中'),
    '公司代墊': select(expense['公司代墊'], '是'),
    '對象': richText(expense['對象']),
    '歸屬年份': { number: Number(expense['歸屬年份'] || $now.format('yyyy')) },
    '歸屬月份': select(expense['歸屬月份'], $now.format('yyyy/MM')),
    '消費日期': { date: { start: text(expense['消費日期'] || $now.format('yyyy-MM-dd'), 32) } },
    '消費金額': { number: Number(expense['消費金額'] || 0) },
    '發票狀態': select(expense['發票狀態'], '尚未提供'),
    '開銷說明': richText(expense['開銷說明']),
    '類別': select(expense['類別'], '其他'),
  },
};

return [{ json: { ...expense, notion_payload: payload } }];`,
  }),
  nodeBase("Create Notion expense page", "n8n-nodes-base.httpRequest", 4.4, [880, 200], {
    method: "POST",
    url: "https://api.notion.com/v1/pages",
    sendHeaders: true,
    headerParameters: notionHeaders(),
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify($json.notion_payload) }}",
    options: {
      response: {
        response: {
          responseFormat: "json",
        },
      },
    },
  }),
  nodeBase("Build Import Summary", "n8n-nodes-base.code", 2, [1120, 200], {
    jsCode: `const notionItems = $input.all();
const expenses = $('Parse AI Expense Array').all().map((item) => item.json);
const session = $('Build OpenAI Payload').first().json;
const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense['消費金額'] || 0), 0);
const categories = [...new Set(expenses.map((expense) => expense['類別']).filter(Boolean))];

return [{
  json: {
    session_id: session.session_id,
    row_number: session.row_number,
    line_user_id: session.line_user_id,
    reply_token: session.reply_token,
    image_message_id: session.image_message_id,
    import_count: expenses.length,
    total_amount: totalAmount,
    category_summary: categories.join('、') || '未分類',
    first_item: expenses[0]?.['品項'] || '消費紀錄',
    notion_page_ids: notionItems.map((item) => item.json.id).filter(Boolean).join(','),
    analysis_completed_at: $now.format('yyyy-MM-dd HH:mm'),
  },
}];`,
  }),
  googleSheetsUpdate("Update session done", [1360, 200], "fin_image_sessions", {
    row_number: "={{ $json.row_number }}",
    session_state: "done",
    analysis_completed_at: "={{ $json.analysis_completed_at }}",
    import_count: "={{ $json.import_count }}",
    total_amount: "={{ $json.total_amount }}",
  }, sessionColumns),
  lineReplyNode(
    "Reply import summary",
    [1600, 200],
    "FIN 消費匯入完成",
    `{
  "type": "bubble",
  "size": "mega",
  "body": {
    "type": "box",
    "layout": "vertical",
    "paddingAll": "0px",
    "backgroundColor": "#F7FAFF",
    "contents": [
      {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "nuvaO FIN",
                "size": "xs",
                "color": "#C9DAFF",
                "wrap": true,
                "weight": "bold",
                "flex": 1
              },
              {
                "type": "text",
                "text": "done",
                "size": "xs",
                "color": "#F4F8FF",
                "wrap": true,
                "weight": "bold",
                "align": "end",
                "flex": 1
              }
            ]
          },
          {
            "type": "text",
            "text": "消費匯入完成",
            "size": "xl",
            "color": "#F4F8FF",
            "wrap": true,
            "weight": "bold",
            "margin": "md"
          },
          {
            "type": "text",
            "text": "已寫入 Google Sheet，並逐筆建立到 Notion。",
            "size": "sm",
            "color": "#C9DAFF",
            "wrap": true,
            "margin": "sm"
          }
        ],
        "backgroundColor": "#102A5F",
        "paddingAll": "20px"
      },
      {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "text",
                "text": "匯入筆數",
                "size": "xs",
                "color": "#2563EB",
                "wrap": true,
                "weight": "bold"
              },
              {
                "type": "text",
                "text": "{{ $('Build Import Summary').item.json.import_count }} 筆 / NT$ {{ $('Build Import Summary').item.json.total_amount }}",
                "size": "sm",
                "color": "#13213F",
                "wrap": true,
                "weight": "bold",
                "margin": "xs"
              }
            ],
            "backgroundColor": "#FDFEFF",
            "borderColor": "#D7E3F4",
            "borderWidth": "light",
            "cornerRadius": "md",
            "paddingAll": "12px"
          },
          {
            "type": "box",
            "layout": "vertical",
            "contents": [
              {
                "type": "text",
                "text": "類別",
                "size": "xs",
                "color": "#2563EB",
                "wrap": true,
                "weight": "bold"
              },
              {
                "type": "text",
                "text": "{{ $('Build Import Summary').item.json.category_summary }}",
                "size": "sm",
                "color": "#13213F",
                "wrap": true,
                "weight": "bold",
                "margin": "xs"
              }
            ],
            "backgroundColor": "#FDFEFF",
            "borderColor": "#D7E3F4",
            "borderWidth": "light",
            "cornerRadius": "md",
            "paddingAll": "12px"
          }
        ],
        "paddingAll": "20px",
        "spacing": "sm",
        "backgroundColor": "#F7FAFF"
      }
    ]
  },
  "styles": {
    "body": {
      "backgroundColor": "#F7FAFF"
    }
  }
}`,
  ),
  lineReplyNode(
    "Reply unsupported message",
    [-2240, 560],
    "FIN 操作提醒",
    flexBubble({
      eyebrow: "nuvaO FIN",
      badge: "請確認",
      title: "請傳圖片或文字說明",
      body: "FIN 消費分析目前只處理截圖與下一則文字說明。請先上傳信用卡截圖。",
      cards: [
        { label: "可用流程", value: "圖片 -> 文字說明 -> AI 分析 -> Google Sheet / Notion" },
      ],
    }),
  ),
];

const connections = {
  "Webhook - LINE FIN": {
    main: [[{ node: "line_loading_animation", type: "main", index: 0 }]],
  },
  line_loading_animation: {
    main: [[{ node: "Normalize LINE Event", type: "main", index: 0 }]],
  },
  "Normalize LINE Event": {
    main: [[{ node: "Route message type", type: "main", index: 0 }]],
  },
  "Route message type": {
    main: [
      [{ node: "Prepare image session", type: "main", index: 0 }],
      [{ node: "Get all FIN sessions", type: "main", index: 0 }],
      [{ node: "Reply unsupported message", type: "main", index: 0 }],
    ],
  },
  "Prepare image session": {
    main: [[{ node: "Append image session", type: "main", index: 0 }]],
  },
  "Append image session": {
    main: [[{ node: "Reply ask expense context", type: "main", index: 0 }]],
  },
  "Get all FIN sessions": {
    main: [[{ node: "Find latest creating session", type: "main", index: 0 }]],
  },
  "Find latest creating session": {
    main: [[{ node: "If creating session exists", type: "main", index: 0 }]],
  },
  "If creating session exists": {
    main: [
      [{ node: "Update session context", type: "main", index: 0 }],
      [{ node: "Reply ask image first", type: "main", index: 0 }],
    ],
  },
  "Update session context": {
    main: [[{ node: "Get active categories", type: "main", index: 0 }]],
  },
  "Get active categories": {
    main: [[{ node: "Aggregate categories with session", type: "main", index: 0 }]],
  },
  "Aggregate categories with session": {
    main: [[{ node: "Download LINE image", type: "main", index: 0 }]],
  },
  "Download LINE image": {
    main: [[{ node: "Build OpenAI Payload", type: "main", index: 0 }]],
  },
  "Build OpenAI Payload": {
    main: [[{ node: "OpenAI - Extract Expense Array", type: "main", index: 0 }]],
  },
  "OpenAI - Extract Expense Array": {
    main: [[{ node: "Store AI raw log", type: "main", index: 0 }]],
  },
  "Store AI raw log": {
    main: [[{ node: "Parse AI Expense Array", type: "main", index: 0 }]],
  },
  "Parse AI Expense Array": {
    main: [[{ node: "Append expense rows", type: "main", index: 0 }]],
  },
  "Append expense rows": {
    main: [[{ node: "Build Notion Payload", type: "main", index: 0 }]],
  },
  "Build Notion Payload": {
    main: [[{ node: "Create Notion expense page", type: "main", index: 0 }]],
  },
  "Create Notion expense page": {
    main: [[{ node: "Build Import Summary", type: "main", index: 0 }]],
  },
  "Build Import Summary": {
    main: [[{ node: "Update session done", type: "main", index: 0 }]],
  },
  "Update session done": {
    main: [[{ node: "Reply import summary", type: "main", index: 0 }]],
  },
};

const workflow = {
  name: "nuvaO - FIN 消費分析小雲寶",
  nodes,
  pinData: {},
  connections,
  active: false,
  settings: {
    executionOrder: "v1",
  },
  versionId: crypto.randomUUID(),
  meta: {
    templateCredsSetupCompleted: false,
    instanceId: "REPLACE_ON_IMPORT",
  },
  tags: [],
};

const fieldRows = [
  ["fin_image_sessions", "session_id", "Session ID", "text", "yes", "auto", "FIN-20260531153000-abc123", "no", "n8n", "每張圖片的一次分析任務主鍵", "", "", "圖片上傳後建立，狀態先是 creating"],
  ["fin_image_sessions", "line_user_id", "LINE User ID", "text", "yes", "LINE webhook", "Uxxxxxxxx", "no", "LINE", "用來找回同一位使用者的 creating session", "", "", ""],
  ["fin_image_sessions", "image_message_id", "LINE Image Message ID", "text", "yes", "LINE webhook", "5555555555555", "no", "LINE", "下載原圖與追蹤圖片來源", "", "", "這就是你要求系統記住的圖片 id"],
  ["fin_image_sessions", "session_state", "狀態", "select", "yes", "creating", "creating / analyzing / done / failed", "yes", "n8n", "控制兩輪對話狀態", "", "", "圖片收到 creating，文字收到 analyzing，匯入完成 done"],
  ["fin_image_sessions", "image_source", "圖片來源", "text", "no", "LINE", "LINE", "yes", "n8n", "來源標記", "", "", ""],
  ["fin_image_sessions", "created_at", "建立時間", "datetime", "yes", "now", "2026-05-31 15:30", "no", "n8n", "圖片上傳時間", "", "", ""],
  ["fin_image_sessions", "description_received_at", "說明收到時間", "datetime", "no", "", "2026-05-31 15:32", "no", "n8n", "第二輪文字收到時間", "", "", ""],
  ["fin_image_sessions", "analysis_completed_at", "分析完成時間", "datetime", "no", "", "2026-05-31 15:33", "no", "n8n", "Notion 建立完成時間", "", "", ""],
  ["fin_image_sessions", "user_description", "使用者補充說明", "long_text", "no", "", "這幾筆都是 5 月客戶拜訪交通，沒有特別說都是公司代墊", "yes", "LINE", "存放第二輪說明原文", "", "", "符合你要先把文字說明放進 Google Sheet 的需求"],
  ["fin_image_sessions", "ai_model", "AI 模型", "text", "yes", "gpt-5.4-mini", "gpt-5.4-mini", "yes", "OpenAI", "本次分析模型", "", "", "可用環境變數 OPENAI_FIN_MODEL 覆蓋"],
  ["fin_image_sessions", "ai_response_id", "AI Response ID", "text", "no", "", "resp_xxx", "no", "OpenAI", "追蹤 API 回應", "", "", ""],
  ["fin_image_sessions", "import_count", "匯入筆數", "number", "no", "0", "3", "no", "n8n", "本張圖片解析出的筆數", "", "", ""],
  ["fin_image_sessions", "total_amount", "匯入總金額", "number", "no", "0", "1540", "no", "n8n", "本張圖片解析出的總額", "", "", ""],
  ["fin_image_sessions", "failed_reason", "失敗原因", "long_text", "no", "", "Notion API error", "no", "n8n", "保留失敗原因", "", "", ""],
  ["fin_categories", "category_key", "類別代碼", "text", "yes", "", "food", "yes", "user", "提供 AI 類別清單", "", "", "使用者可新增任意代碼"],
  ["fin_categories", "category_name", "類別名稱", "text/select", "yes", "", "飲食", "yes", "user", "提供 AI 類別清單與 Notion 類別", "類別", "select", "預設建議先建 飲食 / 交通 / 其他"],
  ["fin_categories", "active", "啟用", "boolean", "yes", "TRUE", "TRUE", "yes", "user", "只使用啟用類別", "", "", ""],
  ["fin_categories", "ai_hint", "AI 判斷提示", "long_text", "no", "", "餐廳、外送、飲料、咖啡", "yes", "user", "幫助 AI 選類別", "", "", ""],
  ["fin_categories", "notion_option_name", "Notion 選項名稱", "text", "no", "same as category_name", "飲食", "yes", "user", "對應 Notion select option", "類別", "select", ""],
  ["fin_categories", "sort_order", "排序", "number", "no", "999", "10", "yes", "user", "管理類別顯示順序", "", "", ""],
  ["fin_ai_raw_logs", "session_id", "Session ID", "text", "yes", "from session", "FIN-20260531153000-abc123", "no", "n8n", "串回圖片 session", "", "", ""],
  ["fin_ai_raw_logs", "line_user_id", "LINE User ID", "text", "yes", "from session", "Uxxxxxxxx", "no", "LINE", "追蹤使用者", "", "", ""],
  ["fin_ai_raw_logs", "image_message_id", "LINE Image Message ID", "text", "yes", "from session", "5555555555555", "no", "LINE", "追蹤圖片", "", "", ""],
  ["fin_ai_raw_logs", "user_description", "使用者補充說明", "long_text", "yes", "from LINE text", "這三筆都是公司代墊", "yes", "LINE", "保留第二輪文字原文", "", "", ""],
  ["fin_ai_raw_logs", "ai_model", "AI 模型", "text", "yes", "gpt-5.4-mini", "gpt-5.4-mini", "yes", "OpenAI", "追蹤模型", "", "", ""],
  ["fin_ai_raw_logs", "ai_response_id", "AI Response ID", "text", "yes", "OpenAI response id", "resp_xxx", "no", "OpenAI", "追蹤 API", "", "", ""],
  ["fin_ai_raw_logs", "ai_status", "AI 狀態", "text", "yes", "completed", "completed", "no", "OpenAI", "回應狀態", "", "", ""],
  ["fin_ai_raw_logs", "raw_response_json", "AI 原始 JSON", "long_text", "yes", "", "{\"output\":[]}", "no", "OpenAI", "Debug 與稽核用", "", "", ""],
  ["fin_ai_raw_logs", "created_at", "建立時間", "datetime", "yes", "now", "2026-05-31 15:33", "no", "n8n", "log 建立時間", "", "", ""],
  ["fin_expense_imports", "session_id", "Session ID", "text", "yes", "from session", "FIN-20260531153000-abc123", "no", "n8n", "串回圖片 session", "AI Session ID", "rich_text", ""],
  ["fin_expense_imports", "expense_index", "圖片內序號", "number", "yes", "auto", "1", "no", "n8n", "同一張圖片內第幾筆", "", "", ""],
  ["fin_expense_imports", "line_user_id", "LINE User ID", "text", "yes", "from session", "Uxxxxxxxx", "no", "LINE", "追蹤使用者", "", "", ""],
  ["fin_expense_imports", "image_message_id", "LINE Image Message ID", "text", "yes", "from session", "5555555555555", "no", "LINE", "追蹤圖片來源", "", "", ""],
  ["fin_expense_imports", "品項", "品項", "title/text", "yes", "AI extracted", "Uber 乘車", "yes", "AI", "Notion title", "品項", "title", "沿用你提供的 Notion 匯入格式"],
  ["fin_expense_imports", "代墊狀態", "代墊狀態", "select", "yes", "代墊中", "代墊中", "yes", "AI/default", "Notion select", "代墊狀態", "select", ""],
  ["fin_expense_imports", "公司代墊", "公司代墊", "select/boolean", "yes", "是", "是", "yes", "AI/default", "Notion select", "公司代墊", "select", "沒有特別說明時預設是"],
  ["fin_expense_imports", "對象", "對象", "text", "no", "", "Uber", "yes", "AI", "商家或付款對象", "對象", "rich_text", ""],
  ["fin_expense_imports", "歸屬年份", "歸屬年份", "number", "yes", "消費日期年份", "2026", "yes", "AI", "Notion number", "歸屬年份", "number", ""],
  ["fin_expense_imports", "歸屬月份", "歸屬月份", "select/text", "yes", "YYYY/MM", "2026/05", "yes", "AI", "Notion select", "歸屬月份", "select", ""],
  ["fin_expense_imports", "消費日期", "消費日期", "date", "yes", "AI extracted", "2026-05-31", "yes", "AI", "Notion date", "消費日期", "date", "建議用 YYYY-MM-DD"],
  ["fin_expense_imports", "消費金額", "消費金額", "number/currency", "yes", "AI extracted", "31234", "yes", "AI", "Notion number", "消費金額", "number", "AI 會移除 NT$ 與逗號"],
  ["fin_expense_imports", "幣別", "幣別", "text/select", "no", "TWD", "TWD", "yes", "AI/default", "保留多幣別擴充", "", "", ""],
  ["fin_expense_imports", "發票狀態", "發票狀態", "select", "yes", "尚未提供", "尚未提供", "yes", "AI/default", "Notion select", "發票狀態", "select", ""],
  ["fin_expense_imports", "開銷說明", "開銷說明", "long_text", "no", "", "客戶拜訪交通費", "yes", "AI/user", "Notion rich text", "開銷說明", "rich_text", ""],
  ["fin_expense_imports", "類別", "類別", "select/text", "yes", "其他", "交通", "yes", "AI/categories", "Notion select", "類別", "select", "可透過 fin_categories 新增"],
  ["fin_expense_imports", "類別是否新增", "類別是否新增", "boolean", "yes", "FALSE", "FALSE", "yes", "AI", "標記是否為新類別", "", "", ""],
  ["fin_expense_imports", "信心分數", "信心分數", "number", "no", "0-1", "0.92", "no", "AI", "人工檢查優先順序", "AI 信心分數", "number", ""],
  ["fin_expense_imports", "需要人工確認", "需要人工確認", "boolean", "yes", "FALSE", "TRUE", "yes", "AI", "低信心或資訊矛盾時為 TRUE", "需要人工確認", "checkbox", ""],
  ["fin_expense_imports", "原始文字", "原始文字", "long_text", "no", "", "Uber * Trip 123 NT$420", "no", "AI", "稽核用原始 OCR/描述", "", "", ""],
  ["fin_expense_imports", "ai_batch_summary", "AI 批次摘要", "long_text", "no", "", "共 3 筆，皆為 5 月交通費", "no", "AI", "整批說明", "", "", ""],
  ["fin_expense_imports", "notion_page_id", "Notion Page ID", "text", "no", "after notion create", "xxxxxxxx", "no", "Notion", "回寫 Notion 頁面 ID", "", "", "目前 workflow 建立頁面後會在 summary 保留 ids；可再加一個 update row 節點回填"],
  ["fin_expense_imports", "created_at", "建立時間", "datetime", "yes", "now", "2026-05-31 15:33", "no", "n8n", "row 建立時間", "", "", ""],
];

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

const csvHeader = [
  "sheet_name",
  "column_key",
  "column_name_zh",
  "data_type",
  "required",
  "default_value",
  "example",
  "editable_by_user",
  "source",
  "n8n_usage",
  "notion_property",
  "notion_type",
  "notes",
];

const csv = "\ufeff" + [csvHeader, ...fieldRows]
  .map((row) => row.map(csvEscape).join(","))
  .join("\n") + "\n";

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "fin-consumption-analysis-workflow.json"), `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
await fs.writeFile(path.join(outputDir, "fin-consumption-google-sheet-fields.csv"), csv, "utf8");

console.log(`Generated ${path.join(outputDir, "fin-consumption-analysis-workflow.json")}`);
console.log(`Generated ${path.join(outputDir, "fin-consumption-google-sheet-fields.csv")}`);
