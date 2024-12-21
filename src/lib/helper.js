const { downloadMediaMessage, isJidGroup } = require("@whiskeysockets/baileys");
const { text } = require("body-parser");
const mime = require("mime-types");
const Caching = require("node-cache");
const cache = new Caching();

async function getMediaMessage(m, inner = false) {
  const TypeMediaMessage = [
    "conversation",
    "imageMessage",
    "documentMessage",
    "audioMessage",
    "videoMessage",
    "stickerMessage",
  ];
  const keyText = {
    imageMessage: "caption",
    documentMessage: "caption",
    videoMessage: "caption",
    audioMessage: null,
    stickerMessage: null,
  };

  try {
    let mediaMessage;
    let text;
    let file = null;

    for (const type of TypeMediaMessage) {
      mediaMessage = m.message[type];
      if (mediaMessage) {
        if (type === "conversation") {
          text = mediaMessage;
          mediaMessage = null;
          break;
        }
        text = mediaMessage[keyText[type]];
        break;
      }
    }

    if (mediaMessage) {
      if (typeof mediaMessage["mediaKey"] === "object") {
        m.message = JSON.parse(JSON.stringify(m.message));
      }
      const stream = await downloadMediaMessage(
        { key: m?.key, message: m?.message },
        "buffer",
        {},
        {
          logger: { level: "silent" },
          //  reuploadRequest: this.client.updateMediaMessage,
        }
      );
      //convert to base64

      const ext = mime.extension(mediaMessage?.["mimetype"]);
      const fileName =
        mediaMessage?.["fileName"] || `${m.key.id}.${ext}` || `${v4()}.${ext}`;
      file = {
        fileName,
        stream: stream,
        ext,
      };
    }
    const isGroup = isJidGroup(m.key.remoteJid);
    return {
      name: m.pushName,
      from: m.key.remoteJid.split("@")[0],
      groupId: isGroup ? m.key.remoteJid : null,
      text,
      file,
      location: m.message?.locationMessage,
    };
  } catch (error) {
    console.log(error);
  }
}

const manageMessagesCache = (number, role, content, isGemini = true) => {
  const newContent = isGemini
    ? { parts: [{ text: content }] }
    : { content: content };

  let msgs = cache.get("messages" + number) ?? [];

  const messages = [
    ...msgs,
    {
      role,
      ...newContent,
    },
  ];

  cache.set("messages" + number, messages, 1800);

  return messages;
};

module.exports = { getMediaMessage, manageMessagesCache };
