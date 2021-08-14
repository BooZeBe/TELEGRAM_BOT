// DEFAULT START OF TELEGRAM BOT API
const TelegramBot = require('node-telegram-bot-api')
const token = 'MY_TELEGRAM_BOT_TOKEN'
const bot = new TelegramBot(token, {polling: true})

// TIME LIB
  // https://www.npmjs.com/package/node-schedule - desc and docs
const schedule = require('node-schedule')

// VARS
  // chatId. setting in bot.on . global for schedule
let chatId

  // arr with obj of businesses
  // ex. {text: 'eat', time: '16:00', repeat: 'Every day'/'Weekdays'/'No repeat'}
const timetable = []

  // simple version of timetable for sending it by bot (list.join('\n'))
let list
  // run this function every timetable change
const resetList = (timetable) => {
  timetable.sort((a, b) => {
    return a.time.slice(0,2) - b.time.slice(0,2)
  })

  list = timetable.map((e, i) => {
    return ++i + ': ' + e.text + ' , ' + e.time + ' , ' + e.repeat
  })
}
resetList(timetable)

// SET TIME
  // lib var here, for canceling reminder in all code
let job

const setSchedule = (timetable, chatId) => {
  timetable.forEach(business => {
    let rule

    switch (business.repeat) {
      case 'Every day':
        rule = new schedule.RecurrenceRule()
        rule.hour = business.time.slice(0, 2) === '00' ? 0 : Number(business.time.slice(0, 2))
        rule.minute = Number(business.time.slice(3, 5))

        job = schedule.scheduleJob(rule, function(){
          bot.sendMessage(chatId, business.text)
        })

        break

      case 'Weekdays':
        rule = new schedule.RecurrenceRule()
        rule.dayOfWeek = [new schedule.Range(1, 5)];
        rule.hour = business.time.slice(0, 2) === '00' ? 0 : Number(business.time.slice(0, 2))
        rule.minute = Number(business.time.slice(3, 5))

        job = schedule.scheduleJob(rule, function(){
          bot.sendMessage(chatId, business.text)
        })

        break

      case 'No repeat':
        rule = new schedule.RecurrenceRule()
        rule.hour = business.time.slice(0, 2) === '00' ? 0 : Number(business.time.slice(0, 2))
        rule.minute = Number(business.time.slice(3, 5))

        job = schedule.scheduleJob(rule, function(){
          bot.sendMessage(chatId, business.text)
          job.cancel()
          timetable.splice(timetable.indexOf(business), 1)
        })

        break
    }
  })
}

// COMMANDS
const start = () => {
  bot.setMyCommands([
    {command: '/start', description: 'Start and greetings'},
    {command: '/mylist', description: 'Show list of your business'},
    {command: '/addbusiness', description: 'Add business to a list'},
    {command: '/deletebusiness', description: 'Delete business from list'},
  ])

  bot.on('message', async msg => {
    chatId = msg.chat.id
    const command = msg.text.split(' ')[0]

    switch (command) {
      // just start command
      case '/start':
        await bot.sendMessage(chatId, 'Hello, my name is Daily Bot. I am your daily helper. You make a to-do list and then every day I remind you of your business')
        await bot.sendSticker(chatId, 'https://cdn.tlgrm.ru/stickers/a0a/6b0/a0a6b09c-7f38-37e5-9dac-583343142b54/192/1.webp')
        break

      // show list of businesses
      case '/mylist':
        await bot.sendMessage(chatId, 'Your list')
        if (list.length > 0) {
          await bot.sendMessage(chatId, list.join('\n'))
        } else {
          await bot.sendMessage(chatId, 'You have nothing in your list')
        }

        break

      // add business to a list
      case '/addbusiness':
        let text
        let time
        let repeat

        await bot.sendMessage(chatId, 'Okay. What business? \n*REPLY* to *THIS* and for the *NEXT TWO* messages', {parse_mode: 'markdown'})
          .then(send => {
            let messageId = send.message_id

            return bot.onReplyToMessage(chatId, messageId, msg => {
              text = msg.text.trim()

              return bot.sendMessage(chatId, 'Ok. Time? \n(24 hours format only ex: 14:00)').then((send) => {
                let messageId = send.message_id

                return bot.onReplyToMessage(chatId, messageId, msg => {
                  let regExp = /^([01][0-9]|2[0-3]):([0-5][0-9])$/

                  if (regExp.test(msg.text)) {
                    time = msg.text.trim()
                    bot.sendMessage(chatId, 'Nice. Repeat? Choose 1,2,3\n(1: Every day, 2: Weekdays, 3: No repeat)').then((send) => {
                      let messageId = send.message_id

                      return bot.onReplyToMessage(chatId, messageId, msg => {
                        switch (msg.text) {
                          case '1':
                            repeat = 'Every day'
                            break
                          case '2':
                            repeat = 'Weekdays'
                            break
                          case '3':
                            repeat = 'No repeat'
                            break
                          default:
                            return bot.sendMessage(chatId, 'Wrong. Try reply again')
                        }

                        timetable.push({text: text, time: time, repeat: repeat})
                        resetList(timetable)
                        return bot.sendMessage(chatId, 'Done. Check your list')
                      })
                    })
                  } else {
                    return bot.sendMessage(chatId, 'Nope. Wrong format. Try reply again')
                  }
                })
              })
            })
          })
        break

      // delete business from list
      case '/deletebusiness':
        const deletingReply = send => {
          let messageId = send.message_id

          return bot.onReplyToMessage(chatId, messageId, msg => {
            if (msg.text <= list.length) {
              timetable.splice(msg.text - 1, 1)
              resetList(timetable)
              return bot.sendMessage(chatId, 'Done. Check your list')
            } else {
              return bot.sendMessage(chatId, 'Wrong number. Try replying again')
            }
          })
        }

        await bot.sendMessage(chatId, 'Sure. Which one? \n*REPLY* to this messages', {parse_mode: 'markdown'})
          .then(deletingReply)

        await bot.sendMessage(chatId, list.join('\n'))
          .then(deletingReply)
        break

      // all messages except replies
      default:
        if (msg.reply_to_message === undefined) {
          await bot.sendMessage(chatId, 'Shut up, i don`t know what is it')
        }
        break
    }

    // canceling prev reminder and setting new on every message
    if (job !== undefined) {
      job.cancel()
    }
    setSchedule(timetable, chatId)
  })
}

start()

