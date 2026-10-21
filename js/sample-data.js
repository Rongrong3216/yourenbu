// sample-data.js —— 首次启动的示例朋友

const SampleData = (() => {
  async function seedIfEmpty() {
    const friends = await DB.getAll('friends');
    if (friends.length > 0) return;

    const now = YB.nowISO();
    const amei = {
      id: 'sample_amei',
      name: '林小满',
      nickname: '阿May（示例）',
      gender: 'female',
      birthday: '1998-05-12',
      contact: '微信 amey_lin',
      occupation: '幼儿园老师',
      how_we_met: '大学室友，上下铺睡了四年',
      known_anniversary: '2017-09-15',
      custom_dates: [{ label: '她妈妈生日', date: '1968-03-20' }],
      tags: ['大学室友', '闺蜜'],
      likes: '一行写一条，回车键换行，比如：\n喜欢吃火锅\n爱喝奶茶\n喜欢的礼物是香水',
      dislikes: '一行写一条，回车键换行，比如：\n不吃香菜\n讨厌被催婚\n不喜欢毛绒玩具',
      avatar: '',
      last_contact_at: new Date(Date.now() - 23 * 86400000).toISOString(),
      created_at: now,
      updated_at: now
    };
    const laowang = {
      id: 'sample_laowang',
      name: '王浩',
      nickname: '老王（示例）',
      gender: 'male',
      birthday: '1995-11-02',
      contact: '微信 laowang_dev',
      occupation: '程序员',
      how_we_met: '第一份工作的同事，一起加班扛过项目上线',
      known_anniversary: '2020-03-01',
      custom_dates: [],
      tags: ['前同事', '球友'],
      likes: '一行写一条，回车键换行，比如：\n周末爱打球\n送数码周边不会错\n喜欢喝美式咖啡',
      dislikes: '一行写一条，回车键换行，比如：\n别跟他聊加班\n不喜欢太甜的奶茶',
      avatar: '',
      last_contact_at: new Date(Date.now() - 120 * 86400000).toISOString(),
      created_at: now,
      updated_at: now
    };

    await DB.put('friends', amei);
    await DB.put('friends', laowang);

    await DB.put('moments', {
      id: 'm_001',
      friend_id: 'sample_amei',
      type: 'moment',
      date: YB.todayStr(),
      content: '这里记你们相处的点滴，比如：\n今天一起吃了火锅，她又被辣哭了',
      created_at: now
    });
    await DB.put('moments', {
      id: 'm_002',
      friend_id: 'sample_amei',
      type: 'promise',
      date: YB.todayStr(),
      content: '这里记你答应过的事，比如：\n答应陪她去看演唱会，11月15日前',
      due_date: '2026-11-15',
      done: false,
      created_at: now
    });
    await DB.put('moments', {
      id: 'm_003',
      friend_id: 'sample_amei',
      type: 'promise',
      date: '2026-09-10',
      content: '答应帮她带奶茶',
      due_date: '2026-09-20',
      done: true,
      created_at: now
    });
    await DB.put('moments', {
      id: 'm_004',
      friend_id: 'sample_laowang',
      type: 'moment',
      date: '2026-09-01',
      content: '这里记你们相处的点滴，比如：\n周末一起打球，他又输了三局',
      created_at: now
    });
    await DB.put('moments', {
      id: 'm_005',
      friend_id: 'sample_laowang',
      type: 'promise',
      date: YB.todayStr(),
      content: '这里记你答应过的事，比如：\n欠他一顿火锅，这周内请',
      due_date: '2026-10-25',
      done: false,
      created_at: now
    });
    await DB.put('moments', {
      id: 'm_006',
      friend_id: 'sample_laowang',
      type: 'promise',
      date: '2026-08-15',
      content: '答应帮他调试新电脑',
      due_date: '2026-08-20',
      done: true,
      created_at: now
    });

    await DB.put('gifts', {
      id: 'g_001',
      friend_id: 'sample_amei',
      date: '2025-05-12',
      gift_name: '祖玛珑鼠尾草与海盐香水 30ml',
      cost: 620,
      reaction: '她超喜欢，说正好是她想试的味道，当天发了三条朋友圈'
    });
    await DB.put('gifts', {
      id: 'g_002',
      friend_id: 'sample_laowang',
      date: '2025-11-02',
      gift_name: '罗技 MX Master 3S 鼠标',
      cost: 799,
      reaction: '他说手感特别好，用了一整年还在夸，上周吃饭又提了一次'
    });
  }

  return { seedIfEmpty };
})();
