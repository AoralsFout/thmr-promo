// The promo's dialogue: TTS input text, subtitles, voice casting and the
// on-screen performance data. Durations are filled in by tools/gen-tts.mjs.
//
// tts       — what the voice model reads (pronunciation-friendly spelling)
// display   — subtitle text shown on screen (can use ⑨ / DA☆ZE / THMR freely)
// voice     — gpt-4o-mini-tts voice name
// instr     — style instructions for the voice model

export const VOICES = {
  renko: { voice: 'alloy', instr: '冷静聪明的年轻女生，语调平稳、带着一点好奇与神秘感的笑意。' },
  merry: { voice: 'marin', instr: '温柔、梦幻、轻声细语的少女，语速偏慢，像在说悄悄话。' },
  sanae: { voice: 'coral', instr: '元气满满的少女电台主播，明快、热情、字正腔圆，语速偏快，像在主持直播节目。' },
  reimu: { voice: 'sage', instr: '慵懒的少女语气，带着无奈和嫌弃，语速偏慢，像在叹气；后半句可以稍微提起精神。' },
  marisa: { voice: 'nova', instr: '元气张扬的少女，语速快、音量足，带着狡黠的笑意和一丝得意。' },
  remilia: { voice: 'shimmer', instr: '高贵的大小姐语气，慢条斯理、从容不迫，带着玩味的笑意。' },
  tenshi: { voice: 'shimmer', instr: '傲慢从容的天人语气，拖长音、微微上扬，自视甚高。' },
  cirno: { voice: 'shimmer', instr: '天真骄傲的小孩子，音调高、大声，像在喊叫，语速快。' },
  satori: { voice: 'sage', instr: '安静温柔的少女，轻声细语，洞察一切的感觉，略带笑意。' },
  koishi: { voice: 'marin', instr: '轻飘飘、梦呓一样的少女声音，气声多、若即若离，带着俏皮的神秘感。' },
};

export const LINES = [
  // ---- S0 序·杂讯 ----
  { id: 's0_renko_1', who: 'renko', tts: '梅莉，快听。这个频率……地图上不存在。', display: '梅莉，快听。这个频率……地图上不存在。' },
  { id: 's0_merry_1', who: 'merry', tts: '……是结界另一边的声音呢。', display: '……是结界另一边的声音呢。' },
  { id: 's0_sanae_id', who: 'sanae', tts: '这里是——东方音乐电台，T H M R！', display: '这里是——东方音乐电台，THMR！' },
  { id: 's0_sanae_id2', who: 'sanae', tts: '这里是——东方音乐电台，T H M R 电台！', display: '（备用：THMR 读法B）' },

  // ---- S1 小剧场·神社的午后 ----
  { id: 's1_reimu_1', who: 'reimu', tts: '唉……今天的赛钱箱，又是空的。', display: '唉……今天的赛钱箱，又是空的。' },
  { id: 's1_marisa_1', who: 'marisa', tts: '灵梦——！大新闻哒贼！幻想乡开电台了！', display: '灵梦——！大新闻 DA☆ZE！幻想乡开电台了！' },
  { id: 's1_reimu_2', who: 'reimu', tts: '电台？幻想乡哪来的电波？', display: '电台？幻想乡哪来的电波？' },
  { id: 's1_sanae_1', who: 'sanae', tts: '在幻想乡，可不能被常识束缚哦！', display: '在幻想乡，可不能被常识束缚哦！' },
  { id: 's1_marisa_2', who: 'marisa', tts: '十三万首东方同人曲，二十四小时不停播，全部免费——哒贼！', display: '十三万首东方同人曲，24 小时不停播，全部免费——DA☆ZE！' },
  { id: 's1_reimu_3', who: 'reimu', tts: '免费……那、那听众，算香火钱吗？', display: '免费……那、那听众，算香火钱吗？' },
  { id: 's1_reimu_4', who: 'reimu', tts: '等等，这些飞过去的字，是什么东西！？', display: '等等，这些飞过去的字，是什么东西！？' },
  { id: 's1_marisa_3', who: 'marisa', tts: '是屏幕那头的听众哒贼。', display: '是屏幕那头的听众 DA☆ZE。' },
  { id: 's1_sanae_2', who: 'sanae', tts: '那么——放送开始！', display: '那么——放送开始！' },

  // ---- S2 放送局巡礼 ----
  { id: 's2_sanae_intro', who: 'sanae', tts: '先来看看放送局的看家本领！', display: '先来看看放送局的看家本领！' },
  { id: 's2_remilia_1', who: 'remilia', tts: '下一首放什么？呵……命运早已写好。', display: '下一首放什么？呵……命运早已写好。' },
  { id: 's2_marisa_4', who: 'marisa', tts: '喜欢的歌？借走！借到死为止，哒贼！', display: '喜欢的歌？借走！借到死为止，DA☆ZE！' },
  { id: 's2_tenshi_1', who: 'tenshi', tts: '三百二十K——这才配得上天人的耳朵。', display: '320K——这才配得上天人的耳朵。' },
  { id: 's2_cirno_1', who: 'cirno', tts: '那我选九十六K！因为里面有九！', display: '那我选⑨6K！因为里面有⑨！' },
  { id: 's2_satori_1', who: 'satori', tts: '不喜欢这首？……我读到了。投票切歌吧。', display: '不喜欢这首？……我读到了。投票切歌吧。' },
  { id: 's2_koishi_1', who: 'koishi', tts: '嘻嘻，我一直都在哦——在你注意不到的地方。', display: '嘻嘻，我一直都在哦——在你注意不到的地方。' },

  // ---- S3 号外·文文新闻 ----
  { id: 's3_sanae_news', who: 'sanae', tts: '号外号外！十三万首曲库，二十四小时放送，五大平台全覆盖！', display: '号外号外！13 万首曲库，24 小时放送，五大平台全覆盖！' },

  // ---- S4 多端实机 ----
  { id: 's4_sanae_1', who: 'sanae', tts: 'windows、macOS、Linux、安卓、iOS——想在哪听，就在哪听。', display: 'Windows、macOS、Linux、安卓、iOS——想在哪听，就在哪听。' },
  { id: 's4_reimu_1', who: 'reimu', tts: '还能换看板娘？……那必须选我。', display: '还能换看板娘？……那必须选我。' },
  { id: 's4_marisa_1', who: 'marisa', tts: '选我哒贼！', display: '选我 DA☆ZE！' },
  { id: 's4_cirno_1', who: 'cirno', tts: '选最强的我！', display: '选最强的我！' },

  // ---- S5 高潮 ----
  { id: 's5_sanae_final', who: 'sanae', tts: '东方音乐电台，T H M R——与幻想乡，同频！', display: '东方音乐电台 THMR——与幻想乡，同频！' },

  // ---- S6 尾声 ----
  { id: 's6_merry_2', who: 'merry', tts: '信号……还在吗？', display: '信号……还在吗？' },
  { id: 's6_renko_2', who: 'renko', tts: '一直都在哦。', display: '一直都在哦。' },
  { id: 's6_cirno_2', who: 'cirno', tts: '片尾彩蛋一共九个！你、找到几个？', display: '片尾彩蛋一共⑨个！你、找到几个？' },
];
