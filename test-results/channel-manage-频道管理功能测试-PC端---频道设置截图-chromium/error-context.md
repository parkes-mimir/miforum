# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: channel-manage.spec.js >> 频道管理功能测试 >> PC端 - 频道设置截图
- Location: tests/e2e/channel-manage.spec.js:4:3

# Error details

```
Error: locator.click: Error: strict mode violation: locator('button:has-text("成员")') resolved to 3 elements:
    1) <button @click="channelSettingsTab = 'members'; loadChannelMembers(editingChannelId)" class="flex-1 py-3 text-sm font-medium border-b-2 transition text-gray-400 border-transparent" :class="channelSettingsTab === 'members' ? 'text-primary-600 border-primary-600' : 'text-gray-400 border-transparent'">成员</button> aka getByRole('button', { name: '成员' })
    2) <button @click="showBoardMemberSelect()" class="text-xs px-2 py-1 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition">添加成员</button> aka getByText('添加成员')
    3) <button class="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition" @click="addBoardVisibleMembers(Array.from(document.querySelectorAll('.board-member-checkbox:checked')).map(el => Number(el.value)))">添加选中成员</button> aka getByText('添加选中成员')

Call log:
  - waiting for locator('button:has-text("成员")')

```

# Page snapshot

```yaml
- generic [ref=f1e1]:
  - banner [ref=f1e2]:
    - generic [ref=f1e3]:
      - link "MiForum" [ref=f1e5] [cursor=pointer]:
        - /url: /
      - generic [ref=f1e9]:
        - link "消息中心" [ref=f1e10] [cursor=pointer]:
          - /url: /messages
        - link "超级管理员 超管 as" [ref=f1e13] [cursor=pointer]:
          - /url: /profile.html?id=1
          - generic [ref=f1e16]:
            - generic [ref=f1e17]:
              - generic [ref=f1e18]: 超级管理员
              - generic [ref=f1e19]: 超管
            - generic [ref=f1e20]: as
        - button "管理" [ref=f1e21] [cursor=pointer]
        - button "退出" [ref=f1e22] [cursor=pointer]
        - button "切换暗色" [ref=f1e23] [cursor=pointer]
        - button "主题色" [ref=f1e27] [cursor=pointer]
  - generic [ref=f1e30]:
    - complementary [ref=f1e31]:
      - navigation [ref=f1e32]:
        - textbox "搜索帖子..." [ref=f1e35]
        - generic [ref=f1e38]:
          - paragraph [ref=f1e39]: 频道
          - button "创建频道" [ref=f1e40] [cursor=pointer]
        - button "热门" [ref=f1e43] [cursor=pointer]
        - generic [ref=f1e47]:
          - generic [ref=f1e48]:
            - button "🏠 官方频道 2" [ref=f1e49] [cursor=pointer]:
              - generic [ref=f1e50]: 🏠
              - generic [ref=f1e51]: 官方频道
              - generic [ref=f1e52]: "2"
            - button "频道设置" [active] [ref=f1e55] [cursor=pointer]
          - generic [ref=f1e59]:
            - button "💬 技术" [ref=f1e60] [cursor=pointer]:
              - generic [ref=f1e61]: 💬
              - generic [ref=f1e62]: 技术
            - button "💬 生活" [ref=f1e63] [cursor=pointer]:
              - generic [ref=f1e64]: 💬
              - generic [ref=f1e65]: 生活
            - button "🔥 热门" [ref=f1e66] [cursor=pointer]:
              - generic [ref=f1e67]: 🔥
              - generic [ref=f1e68]: 热门
            - button "📢 公告" [ref=f1e69] [cursor=pointer]:
              - generic [ref=f1e70]: 📢
              - generic [ref=f1e71]: 公告
            - button "💬 测试" [ref=f1e72] [cursor=pointer]:
              - generic [ref=f1e73]: 💬
              - generic [ref=f1e74]: 测试
            - button "💬 游戏" [ref=f1e75] [cursor=pointer]:
              - generic [ref=f1e76]: 💬
              - generic [ref=f1e77]: 游戏
            - button "添加板块" [ref=f1e78] [cursor=pointer]
        - generic [ref=f1e82]:
          - button "asd asd 1" [ref=f1e83] [cursor=pointer]:
            - generic [ref=f1e84]: asd
            - generic [ref=f1e85]: asd
            - generic [ref=f1e86]: "1"
          - button "频道设置" [ref=f1e89] [cursor=pointer]
        - generic [ref=f1e94]:
          - button "💬 sadf 1" [ref=f1e95] [cursor=pointer]:
            - generic [ref=f1e96]: 💬
            - generic [ref=f1e97]: sadf
            - generic [ref=f1e98]: "1"
          - button "频道设置" [ref=f1e101] [cursor=pointer]
        - generic [ref=f1e106]:
          - button "💬 管理员频道 1" [ref=f1e107] [cursor=pointer]:
            - generic [ref=f1e108]: 💬
            - generic [ref=f1e109]: 管理员频道
            - generic [ref=f1e110]: "1"
          - button "加入频道" [ref=f1e113] [cursor=pointer]
          - button "频道设置" [ref=f1e116] [cursor=pointer]
        - generic [ref=f1e121]:
          - button "💬 测试频道 1" [ref=f1e122] [cursor=pointer]:
            - generic [ref=f1e123]: 💬
            - generic [ref=f1e124]: 测试频道
            - generic [ref=f1e125]: "1"
          - button "频道设置" [ref=f1e128] [cursor=pointer]
      - link "积分商店" [ref=f1e133] [cursor=pointer]:
        - /url: /shop
      - generic [ref=f1e136]:
        - paragraph [ref=f1e137]: 热门标签
        - button "#2 1" [ref=f1e139] [cursor=pointer]
      - generic [ref=f1e141]:
        - generic [ref=f1e142]:
          - generic [ref=f1e143]: 每日签到
          - generic [ref=f1e147]: 99060 积分
        - generic [ref=f1e148]:
          - generic [ref=f1e149]:
            - generic [ref=f1e150]: "12"
            - generic [ref=f1e151]: 连续签到
          - generic [ref=f1e152]:
            - generic [ref=f1e153]: "12"
            - generic [ref=f1e154]: 累计签到
        - generic [ref=f1e155]: ✓ 今日已签到
        - button "查看签到日历" [ref=f1e156] [cursor=pointer]
      - generic [ref=f1e158]:
        - paragraph [ref=f1e159]: 社区统计
        - generic [ref=f1e160]:
          - generic [ref=f1e161]: 话题数
          - generic [ref=f1e162]: "18"
        - generic [ref=f1e163]:
          - generic [ref=f1e164]: 评论数
          - generic [ref=f1e165]: "11"
    - main [ref=f1e166]:
      - generic [ref=f1e167]:
        - generic [ref=f1e168]:
          - heading "热门" [level=1] [ref=f1e169]
          - paragraph [ref=f1e170]: 根据你的兴趣推荐的热门帖子
        - button "发布新话题" [ref=f1e171] [cursor=pointer]
      - generic [ref=f1e174]:
        - button "最新" [ref=f1e175] [cursor=pointer]
        - button "最多赞" [ref=f1e176] [cursor=pointer]
        - button "最早" [ref=f1e177] [cursor=pointer]
      - generic [ref=f1e178]:
        - generic [ref=f1e180] [cursor=pointer]:
          - link [ref=f1e181]:
            - /url: /profile.html?id=1
          - generic [ref=f1e183]:
            - generic [ref=f1e184]:
              - generic [ref=f1e185]: 超级管理员
              - generic [ref=f1e186]: as
              - generic [ref=f1e187]: ⭐Lv2
              - generic [ref=f1e188]: "#000000"
              - generic [ref=f1e189]: 2026年9月5日
              - generic [ref=f1e190]: 技术
              - generic [ref=f1e191]: (已编辑)
              - generic [ref=f1e192]:
                - button "置顶" [ref=f1e193]
                - button "删除" [ref=f1e194]
            - heading "2" [level=3] [ref=f1e195]
            - paragraph [ref=f1e196]: "1"
            - generic [ref=f1e197]:
              - button "0" [ref=f1e198]
              - generic [ref=f1e202]: "8"
              - button "收藏" [ref=f1e206]
              - button "分享" [ref=f1e209]
        - generic [ref=f1e213] [cursor=pointer]:
          - link [ref=f1e214]:
            - /url: /profile.html?id=1
          - generic [ref=f1e216]:
            - generic [ref=f1e217]:
              - generic [ref=f1e218]: 超级管理员
              - generic [ref=f1e219]: as
              - generic [ref=f1e220]: ⭐Lv2
              - generic [ref=f1e221]: "#000000"
              - generic [ref=f1e222]: 2026年9月7日
              - generic [ref=f1e223]: 生活
              - generic [ref=f1e224]: (已编辑)
              - generic [ref=f1e225]:
                - button "置顶" [ref=f1e226]
                - button "删除" [ref=f1e227]
            - heading "2" [level=3] [ref=f1e228]
            - paragraph [ref=f1e229]: "1"
            - generic [ref=f1e230]: "#2"
            - generic [ref=f1e233]:
              - button "1" [ref=f1e234]
              - generic [ref=f1e238]: "3"
              - button "收藏" [ref=f1e242]
              - button "分享" [ref=f1e245]
        - generic [ref=f1e249] [cursor=pointer]:
          - link [ref=f1e250]:
            - /url: /profile.html?id=1
          - generic [ref=f1e252]:
            - generic [ref=f1e253]:
              - generic [ref=f1e254]: 超级管理员
              - generic [ref=f1e255]: as
              - generic [ref=f1e256]: ⭐Lv2
              - generic [ref=f1e257]: "#000000"
              - generic [ref=f1e258]: 2026年9月5日
              - generic [ref=f1e259]: 技术
              - generic [ref=f1e260]:
                - button "置顶" [ref=f1e261]
                - button "删除" [ref=f1e262]
            - heading "1" [level=3] [ref=f1e263]
            - paragraph [ref=f1e264]: "1"
            - generic [ref=f1e265]:
              - button "0" [ref=f1e266]
              - generic [ref=f1e270]: "0"
              - button "收藏" [ref=f1e274]
              - button "分享" [ref=f1e277]
        - generic [ref=f1e281] [cursor=pointer]:
          - link [ref=f1e282]:
            - /url: /profile.html?id=1
          - generic [ref=f1e284]:
            - generic [ref=f1e285]:
              - generic [ref=f1e286]: 超级管理员
              - generic [ref=f1e287]: as
              - generic [ref=f1e288]: ⭐Lv2
              - generic [ref=f1e289]: "#000000"
              - generic [ref=f1e290]: 2026年9月5日
              - generic [ref=f1e291]: 技术
              - generic [ref=f1e292]:
                - button "置顶" [ref=f1e293]
                - button "删除" [ref=f1e294]
            - heading "1" [level=3] [ref=f1e295]
            - paragraph [ref=f1e296]: "1"
            - generic [ref=f1e297]:
              - button "0" [ref=f1e298]
              - generic [ref=f1e302]: "0"
              - button "收藏" [ref=f1e306]
              - button "分享" [ref=f1e309]
        - generic [ref=f1e313] [cursor=pointer]:
          - link [ref=f1e314]:
            - /url: /profile.html?id=1
          - generic [ref=f1e316]:
            - generic [ref=f1e317]:
              - generic [ref=f1e318]: 超级管理员
              - generic [ref=f1e319]: as
              - generic [ref=f1e320]: ⭐Lv2
              - generic [ref=f1e321]: "#000000"
              - generic [ref=f1e322]: 2026年9月5日
              - generic [ref=f1e323]: 技术
              - generic [ref=f1e324]:
                - button "置顶" [ref=f1e325]
                - button "删除" [ref=f1e326]
            - heading "1" [level=3] [ref=f1e327]
            - paragraph [ref=f1e328]: "1"
            - generic [ref=f1e329]:
              - button "0" [ref=f1e330]
              - generic [ref=f1e334]: "0"
              - button "收藏" [ref=f1e338]
              - button "分享" [ref=f1e341]
        - generic [ref=f1e345] [cursor=pointer]:
          - link [ref=f1e346]:
            - /url: /profile.html?id=1
          - generic [ref=f1e348]:
            - generic [ref=f1e349]:
              - generic [ref=f1e350]: 超级管理员
              - generic [ref=f1e351]: as
              - generic [ref=f1e352]: ⭐Lv2
              - generic [ref=f1e353]: "#000000"
              - generic [ref=f1e354]: 2026年9月6日
              - generic [ref=f1e355]: 技术
              - generic [ref=f1e356]: 📷2
              - generic [ref=f1e357]:
                - button "置顶" [ref=f1e358]
                - button "删除" [ref=f1e359]
            - heading "1" [level=3] [ref=f1e360]
            - paragraph [ref=f1e361]: 2blob:http://localhost:3000/edb48c48-1056-456d-83ed-0158b8846394 3333 blob:http://localhost:3000/0c1e5f07-836f-4fa3-8077-765307068b84
            - generic [ref=f1e363]:
              - button "0" [ref=f1e364]
              - generic [ref=f1e368]: "0"
              - button "收藏" [ref=f1e372]
              - button "分享" [ref=f1e375]
        - generic [ref=f1e379] [cursor=pointer]:
          - link [ref=f1e380]:
            - /url: /profile.html?id=1
          - generic [ref=f1e382]:
            - generic [ref=f1e383]:
              - generic [ref=f1e384]: 超级管理员
              - generic [ref=f1e385]: as
              - generic [ref=f1e386]: ⭐Lv2
              - generic [ref=f1e387]: "#000000"
              - generic [ref=f1e388]: 2026年9月6日
              - generic [ref=f1e389]: 技术
              - generic [ref=f1e390]: 📷2
              - generic [ref=f1e391]:
                - button "置顶" [ref=f1e392]
                - button "删除" [ref=f1e393]
            - heading "1" [level=3] [ref=f1e394]
            - paragraph [ref=f1e395]: 家人们事实上 我我我 哈哈哈
            - generic [ref=f1e397]:
              - button "0" [ref=f1e398]
              - generic [ref=f1e402]: "0"
              - button "收藏" [ref=f1e406]
              - button "分享" [ref=f1e409]
        - generic [ref=f1e413] [cursor=pointer]:
          - link [ref=f1e414]:
            - /url: /profile.html?id=1
          - generic [ref=f1e416]:
            - generic [ref=f1e417]:
              - generic [ref=f1e418]: 超级管理员
              - generic [ref=f1e419]: as
              - generic [ref=f1e420]: ⭐Lv2
              - generic [ref=f1e421]: "#000000"
              - generic [ref=f1e422]: 2026年9月6日
              - generic [ref=f1e423]: 技术
              - generic [ref=f1e424]:
                - button "置顶" [ref=f1e425]
                - button "删除" [ref=f1e426]
            - heading "1" [level=3] [ref=f1e427]
            - paragraph [ref=f1e428]: "1"
            - generic [ref=f1e430]:
              - button "0" [ref=f1e431]
              - generic [ref=f1e435]: "0"
              - button "收藏" [ref=f1e439]
              - button "分享" [ref=f1e442]
        - generic [ref=f1e446] [cursor=pointer]:
          - link [ref=f1e447]:
            - /url: /profile.html?id=1
          - generic [ref=f1e449]:
            - generic [ref=f1e450]:
              - generic [ref=f1e451]: 超级管理员
              - generic [ref=f1e452]: as
              - generic [ref=f1e453]: ⭐Lv2
              - generic [ref=f1e454]: "#000000"
              - generic [ref=f1e455]: 2026年9月6日
              - generic [ref=f1e456]: 技术
              - generic [ref=f1e457]:
                - button "置顶" [ref=f1e458]
                - button "删除" [ref=f1e459]
            - heading "1" [level=3] [ref=f1e460]
            - paragraph [ref=f1e461]: "11"
            - generic [ref=f1e463]:
              - button "0" [ref=f1e464]
              - generic [ref=f1e468]: "0"
              - button "收藏" [ref=f1e472]
              - button "分享" [ref=f1e475]
        - generic [ref=f1e479] [cursor=pointer]:
          - link [ref=f1e480]:
            - /url: /profile.html?id=1
          - generic [ref=f1e482]:
            - generic [ref=f1e483]:
              - generic [ref=f1e484]: 超级管理员
              - generic [ref=f1e485]: as
              - generic [ref=f1e486]: ⭐Lv2
              - generic [ref=f1e487]: "#000000"
              - generic [ref=f1e488]: 2026年9月6日
              - generic [ref=f1e489]: 技术
              - generic [ref=f1e490]: 📷2
              - generic [ref=f1e491]:
                - button "置顶" [ref=f1e492]
                - button "删除" [ref=f1e493]
            - heading "1" [level=3] [ref=f1e494]
            - paragraph [ref=f1e495]: "12"
            - generic [ref=f1e497]:
              - button "0" [ref=f1e498]
              - generic [ref=f1e502]: "0"
              - button "收藏" [ref=f1e506]
              - button "分享" [ref=f1e509]
        - generic [ref=f1e513] [cursor=pointer]:
          - link [ref=f1e514]:
            - /url: /profile.html?id=1
          - generic [ref=f1e516]:
            - generic [ref=f1e517]:
              - generic [ref=f1e518]: 超级管理员
              - generic [ref=f1e519]: as
              - generic [ref=f1e520]: ⭐Lv2
              - generic [ref=f1e521]: "#000000"
              - generic [ref=f1e522]: 2026年9月6日
              - generic [ref=f1e523]: 技术
              - generic [ref=f1e524]:
                - button "置顶" [ref=f1e525]
                - button "删除" [ref=f1e526]
            - heading "1" [level=3] [ref=f1e527]
            - paragraph [ref=f1e528]: "1"
            - generic [ref=f1e529]:
              - button "0" [ref=f1e530]
              - generic [ref=f1e534]: "0"
              - button "收藏" [ref=f1e538]
              - button "分享" [ref=f1e541]
        - generic [ref=f1e545] [cursor=pointer]:
          - link [ref=f1e546]:
            - /url: /profile.html?id=1
          - generic [ref=f1e548]:
            - generic [ref=f1e549]:
              - generic [ref=f1e550]: 超级管理员
              - generic [ref=f1e551]: as
              - generic [ref=f1e552]: ⭐Lv2
              - generic [ref=f1e553]: "#000000"
              - generic [ref=f1e554]: 2026年9月6日
              - generic [ref=f1e555]: 技术
              - generic [ref=f1e556]: 📷2
              - generic [ref=f1e557]:
                - button "置顶" [ref=f1e558]
                - button "删除" [ref=f1e559]
            - heading "1" [level=3] [ref=f1e560]
            - paragraph [ref=f1e561]: "22334432323"
            - generic [ref=f1e563]:
              - button "0" [ref=f1e564]
              - generic [ref=f1e568]: "0"
              - button "收藏" [ref=f1e572]
              - button "分享" [ref=f1e575]
        - generic [ref=f1e579] [cursor=pointer]:
          - link [ref=f1e580]:
            - /url: /profile.html?id=1
          - generic [ref=f1e582]:
            - generic [ref=f1e583]:
              - generic [ref=f1e584]: 超级管理员
              - generic [ref=f1e585]: as
              - generic [ref=f1e586]: ⭐Lv2
              - generic [ref=f1e587]: "#000000"
              - generic [ref=f1e588]: 2026年9月6日
              - generic [ref=f1e589]: 技术
              - generic [ref=f1e590]: 📷2
              - generic [ref=f1e591]:
                - button "置顶" [ref=f1e592]
                - button "删除" [ref=f1e593]
            - heading "1" [level=3] [ref=f1e594]
            - paragraph [ref=f1e595]: "23333332143434543445543"
            - generic [ref=f1e597]:
              - button "0" [ref=f1e598]
              - generic [ref=f1e602]: "0"
              - button "收藏" [ref=f1e606]
              - button "分享" [ref=f1e609]
        - generic [ref=f1e613] [cursor=pointer]:
          - link [ref=f1e614]:
            - /url: /profile.html?id=1
          - generic [ref=f1e616]:
            - generic [ref=f1e617]:
              - generic [ref=f1e618]: 超级管理员
              - generic [ref=f1e619]: as
              - generic [ref=f1e620]: ⭐Lv2
              - generic [ref=f1e621]: "#000000"
              - generic [ref=f1e622]: 2026年9月6日
              - generic [ref=f1e623]: 技术
              - generic [ref=f1e624]: 📷2
              - generic [ref=f1e625]:
                - button "置顶" [ref=f1e626]
                - button "删除" [ref=f1e627]
            - heading "12312434234" [level=3] [ref=f1e628]
            - paragraph [ref=f1e629]: 234234523465 213213423
            - generic [ref=f1e631]:
              - button "0" [ref=f1e632]
              - generic [ref=f1e636]: "0"
              - button "收藏" [ref=f1e640]
              - button "分享" [ref=f1e643]
        - generic [ref=f1e647] [cursor=pointer]:
          - link [ref=f1e648]:
            - /url: /profile.html?id=1
          - generic [ref=f1e650]:
            - generic [ref=f1e651]:
              - generic [ref=f1e652]: 超级管理员
              - generic [ref=f1e653]: as
              - generic [ref=f1e654]: ⭐Lv2
              - generic [ref=f1e655]: "#000000"
              - generic [ref=f1e656]: 2026年9月6日
              - generic [ref=f1e657]: 技术
              - generic [ref=f1e658]: 📷2
              - generic [ref=f1e659]:
                - button "置顶" [ref=f1e660]
                - button "删除" [ref=f1e661]
            - heading "投入6543563" [level=3] [ref=f1e662]
            - paragraph [ref=f1e663]: 热而问题我 213423142
            - generic [ref=f1e665]:
              - button "0" [ref=f1e666]
              - generic [ref=f1e670]: "0"
              - button "收藏" [ref=f1e674]
              - button "分享" [ref=f1e677]
        - generic [ref=f1e681] [cursor=pointer]:
          - link [ref=f1e682]:
            - /url: /profile.html?id=1
          - generic [ref=f1e684]:
            - generic [ref=f1e685]:
              - generic [ref=f1e686]: 超级管理员
              - generic [ref=f1e687]: as
              - generic [ref=f1e688]: ⭐Lv2
              - generic [ref=f1e689]: "#000000"
              - generic [ref=f1e690]: 2026年9月6日
              - generic [ref=f1e691]: 技术
              - generic [ref=f1e692]:
                - button "置顶" [ref=f1e693]
                - button "删除" [ref=f1e694]
            - heading "1" [level=3] [ref=f1e695]
            - paragraph
            - generic [ref=f1e697]:
              - button "0" [ref=f1e698]
              - generic [ref=f1e702]: "0"
              - button "收藏" [ref=f1e706]
              - button "分享" [ref=f1e709]
        - generic [ref=f1e713] [cursor=pointer]:
          - link [ref=f1e714]:
            - /url: /profile.html?id=1
          - generic [ref=f1e716]:
            - generic [ref=f1e717]:
              - generic [ref=f1e718]: 超级管理员
              - generic [ref=f1e719]: as
              - generic [ref=f1e720]: ⭐Lv2
              - generic [ref=f1e721]: "#000000"
              - generic [ref=f1e722]: 2026年9月6日
              - generic [ref=f1e723]: 技术
              - generic [ref=f1e724]: 📷2
              - generic [ref=f1e725]:
                - button "置顶" [ref=f1e726]
                - button "删除" [ref=f1e727]
            - heading "111" [level=3] [ref=f1e728]
            - paragraph [ref=f1e729]: "222"
            - generic [ref=f1e731]:
              - button "0" [ref=f1e732]
              - generic [ref=f1e736]: "0"
              - button "收藏" [ref=f1e740]
              - button "分享" [ref=f1e743]
        - generic [ref=f1e747] [cursor=pointer]:
          - link [ref=f1e748]:
            - /url: /profile.html?id=1
          - generic [ref=f1e750]:
            - generic [ref=f1e751]:
              - generic [ref=f1e752]: 超级管理员
              - generic [ref=f1e753]: as
              - generic [ref=f1e754]: ⭐Lv2
              - generic [ref=f1e755]: "#000000"
              - generic [ref=f1e756]: 2026年9月14日
              - generic [ref=f1e757]: 技术
              - generic [ref=f1e758]:
                - button "置顶" [ref=f1e759]
                - button "删除" [ref=f1e760]
            - heading "1" [level=3] [ref=f1e761]
            - paragraph [ref=f1e762]: "1"
            - generic [ref=f1e763]:
              - button "0" [ref=f1e764]
              - generic [ref=f1e768]: "0"
              - button "收藏" [ref=f1e772]
              - button "分享" [ref=f1e775]
  - dialog "频道设置" [ref=f1e778]:
    - generic [ref=f1e779]:
      - generic [ref=f1e780]:
        - heading "频道设置" [level=2] [ref=f1e781]
        - button [ref=f1e782] [cursor=pointer]
      - generic [ref=f1e785]:
        - button "信息" [ref=f1e786] [cursor=pointer]
        - button "成员" [ref=f1e787] [cursor=pointer]
        - button "板块" [ref=f1e788] [cursor=pointer]
      - generic [ref=f1e790]:
        - generic [ref=f1e791]:
          - generic [ref=f1e792]: 频道名称
          - textbox [ref=f1e793]: 官方频道
        - generic [ref=f1e794]:
          - generic [ref=f1e795]: 简介
          - textbox [ref=f1e796]: MiForum 官方频道
        - generic [ref=f1e797]:
          - generic [ref=f1e798]: 图标
          - textbox [ref=f1e799]: 🏠
        - generic [ref=f1e800]:
          - generic [ref=f1e801]: 加入策略
          - combobox [ref=f1e802]:
            - option "所有人可加入" [selected]
            - option "需要审核"
            - option "不允许加入"
        - button "保存设置" [ref=f1e803] [cursor=pointer]
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test.describe('频道管理功能测试', () => {
  4  |   test('PC端 - 频道设置截图', async ({ page }) => {
  5  |     await page.goto('/');
  6  |     await page.waitForTimeout(2000);
  7  | 
  8  |     // 登录超管
  9  |     await page.evaluate(async () => {
  10 |       await fetch('/api/login', {
  11 |         method: 'POST',
  12 |         headers: { 'Content-Type': 'application/json' },
  13 |         body: JSON.stringify({ email: 'root@miforum.local', password: '123456' })
  14 |       });
  15 |     });
  16 |     await page.reload();
  17 |     await page.waitForTimeout(2000);
  18 | 
  19 |     // 点击频道设置
  20 |     const settingsBtn = page.locator('button[title="频道设置"]').first();
  21 |     if (await settingsBtn.isVisible()) {
  22 |       await settingsBtn.click();
  23 |       await page.waitForTimeout(1000);
  24 |       
  25 |       // 切换到成员标签
> 26 |       await page.locator('button:has-text("成员")').click();
     |                                                   ^ Error: locator.click: Error: strict mode violation: locator('button:has-text("成员")') resolved to 3 elements:
  27 |       await page.waitForTimeout(500);
  28 |       
  29 |       await page.screenshot({ path: 'test-results/channel-members-pc.png', fullPage: true });
  30 |     }
  31 |   });
  32 | 
  33 |   test('移动端截图', async ({ page }) => {
  34 |     await page.goto('/');
  35 |     await page.waitForTimeout(2000);
  36 |     await page.setViewportSize({ width: 375, height: 812 });
  37 | 
  38 |     await page.evaluate(async () => {
  39 |       await fetch('/api/login', {
  40 |         method: 'POST',
  41 |         headers: { 'Content-Type': 'application/json' },
  42 |         body: JSON.stringify({ email: 'root@miforum.local', password: '123456' })
  43 |       });
  44 |     });
  45 |     await page.reload();
  46 |     await page.waitForTimeout(2000);
  47 | 
  48 |     await page.screenshot({ path: 'test-results/channel-mobile.png', fullPage: true });
  49 |   });
  50 | });
  51 | 
```