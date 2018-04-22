const { RtmClient , RTM_EVENTS , CLIENT_EVENTS , WebClient } = require('@slack/client');
const token = '';
const moment = require('moment');
const aHolidays = [moment("01/01/2018'", "DD/MM/YYYY"),
                    moment('15/01/2018', "DD/MM/YYYY"),
                    moment('19/02/2018', "DD/MM/YYYY"),
                    moment('28/05/2018', "DD/MM/YYYY"),
                    moment('04/07/2018', "DD/MM/YYYY"),
                    moment('03/09/2018', "DD/MM/YYYY"),
                    moment('08/10/2018', "DD/MM/YYYY"),
                    moment('12/11/2018', "DD/MM/YYYY"),
                    moment('25/11/2018', "DD/MM/YYYY"),
                    moment('25/12/2018', "DD/MM/YYYY")];
var EventSource = require('eventsource');

var es = new EventSource('http://localhost:3000/stream');
es.onmessage = function(e) {
    console.log(e.data);
};
es.onerror = function() {
    console.log('ERROR!');
};



let rtm = new RtmClient(token,{ logLevel: 'error',// Sets the level of logging we require 
                                  dataStore: false, // Initialize a data store for our client, this will // load additional helper functions for the storing // and retrieval of data
                                  useRtmConnect: true,});  

let web = new WebClient(token);

let today = moment();

let search =aHolidays.map((fecha)=>{
                        return today.diff(fecha,"days");
                    })
                    .filter((dayNumber)=>{
                        return dayNumber < 0;
                    });

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {  
    //let user = slack.dataStore.getUserById(slack.activeUserId);
    //let team = slack.dataStore.getTeamById(slack.activeTeamId);

    // Log the slack team name and the bot's name, using ES6's template string 
    // syntax
    //console.log(`Connected to ${team.name} as ${user.name}`);

    web.channels.list()
        .then((res) =>{
            let botChannel = res.channels.find(channel => channel.is_member);

            if (botChannel) {
                // We now have a channel ID to post a message in!
                // use the `sendMessage()` method to send a simple string to a channel using the channel ID
                //rtm.sendMessage('Hello, world!', botChannel.id)
                  // Returns a promise that resolves when the message is sent
                //  .then(() => console.log(`Message sent to channel ${botChannel.name}`))
                //  .catch(console.error);
              } else {
                console.log('This bot does not belong to any channels, invite it to at least one and try again');
              }            
        })
        .catch((err)=>{
            console.log(err);
        });


});    

rtm.on(RTM_EVENTS.MESSAGE, onMessage);

async function onMessage (message){
    // For structure of `message`, see https://api.slack.com/events/message
  
    // Skip messages that are from a bot or my own user ID
    if (message.subtype && message.subtype === 'bot_message'){
      return;
    }

    let messageText = message.text.toLowerCase();

    /*if (messageText.match( /cuando|proximo|feriado|yanky|usa|cuanto|falta/g ).length > 3 ){
        let days = Math.abs(search[0]);
        let phrase = ( days < 30 ) ? "ya falta poco !!" : "no queda otra que esperar ..";

        rtm.sendMessage(`El próximo feriado yanky es en  ${days} días, ${ phrase }`, message.channel)
        .then(() => console.log(`Message sent`))
        .catch(console.error);        
    }*/

    if (Array.isArray(messageText.match( /\b(?:quien|esta|conectado)\b/g )) && messageText.match( /\b(?:quien|esta|conectado)\b/g ).length > 2 ){
        const channels = await web.channels.info(message.channel);
        const aUsers = await Promise.all(channels.channel.members.map(getUserFromApi));
        let aOnline =  aUsers
                        .filter( user => user.presence === 'active' )
                        .map((user) => user.real_name );



        rtm.sendMessage(`Los conectados son los siguientes -> ${aOnline.join(',')}`, message.channel)
            .then(() => console.log(`Message sent`))
            .catch(console.error);        



        async function getUserFromApi(memberId){
            let userResult = {};
            const memberData = await web.users.info(memberId);
            const memberPresence = await web.users.getPresence(memberId);

            userResult.presence = memberPresence.presence;
            userResult.real_name = memberData.user.profile.real_name;

            return userResult;
        }
    }


    // Log the message
    console.log('New message: ', message);
  };

rtm.start();
