"use strict";

const fs = require('fs');
const path = require('path');
const csvjson = require('csvjson');
const _ = require('underscore')

const playData = fs.readFileSync('./NBA Hackathon - Play by Play Data Sample (50 Games).csv', 'utf8');
let plays = csvjson.toObject(playData);

const lineupData = fs.readFileSync('./NBAHackathon-GameLineupDataSample(50Games).csv', 'utf8');
let lineups = csvjson.toObject(lineupData);

lineups.forEach(function(element, index) {
  lineups[index]['Period'] = parseInt(lineups[index]['Period']);
})

plays.forEach(function(element, index) {
  plays[index]['Event_Num'] = parseInt(plays[index]['Event_Num']);
  plays[index]['Event_Msg_Type'] = parseInt(plays[index]['Event_Msg_Type']);
  plays[index]['Period'] = parseInt(plays[index]['Period']);
  plays[index]['WC_Time'] = parseInt(plays[index]['WC_Time']);
  plays[index]['PC_Time'] = parseInt(plays[index]['PC_Time']);
  plays[index]['Action_Type'] = parseInt(plays[index]['Action_Type']);
  plays[index]['Option1'] = parseInt(plays[index]['Option1']);
  plays[index]['Option2'] = parseInt(plays[index]['Option2']);
  plays[index]['Option3'] = parseInt(plays[index]['Option3']);
  plays[index]['Team_id_type'] = parseInt(plays[index]['Team_id_type']);
})



let finalArr = [];
let players = [];

function quarterStart(quarter) {
  players.forEach((person) => {
    person.isActive = false;
  })
  for (let i = 0; i < 10; i++) {
    let playerExists = false;
    players.forEach((person) => {
      if (person.name === lineups[i].Person_id) {
        person.isActive = true;
        playerExists = true;
      }
    })

    if (!playerExists) {
      let person = {};
      person.game = lineups[i].Game_id;
      person.name = lineups[i].Person_id;
      person.team = lineups[i].Team_id;
      person.isActive = true;
      person.plusMinus = 0;
      players.push(person);
    }
  }
  lineups.splice(0, 10);
}

function madeBasket(play) {
  players.forEach((person, index) => {
    if (person.isActive) {
      if (person.team === play.Team_id) {
        person.plusMinus += play.Option1;
      } else {
        person.plusMinus -= play.Option1;
      }
    }
  })
}

function freeThrow(play) {
  players.forEach((person, index) => {
    if (person.isActive && play.Option1 === 1) {
      if (person.team === play.Team_id) {
        person.plusMinus += play.Option1;
      } else {
        person.plusMinus -= play.Option1;
      }
    }
  })
}

function substitution(play) {
  let subExists = false;
  let team = '';
  players.forEach((person, index) => {
    if (person.name === play.Person1) {
      person.isActive = false;
      team = person.team;
    } else if (person.name === play.Person2) {
      person.isActive = true;
      subExists = true;
    }
  })

  if (!subExists) {

    let person = {};
    person.game = play.Game_id;
    person.name = play.Person2;
    person.team = team;
    person.isActive = true;
    person.plusMinus = 0;
    players.push(person);
  }
}

function quarterEngine(quarter) {
  let counter = 0;
  let pendingSubs = [];
  while (plays[counter].Event_Msg_Type !== 13) {
    if (pendingSubs.length !== 0 && plays[counter].Event_Msg_Type !== 3) {
      pendingSubs.forEach((sub) => {
        substitution(sub);
      })
      pendingSubs = [];
    }

    if (plays[counter].Event_Msg_Type === 1) {
      madeBasket(plays[counter]);
    }

    else if (plays[counter].Event_Msg_Type === 3) {
      freeThrow(plays[counter]);

      let checkSubs = counter + 1;
      while (plays[checkSubs].Event_Msg_Type === 8) {
        pendingSubs.push(plays[checkSubs]);
        checkSubs++;
      }
      counter = checkSubs - 1;
    }

    else if (plays[counter].Event_Msg_Type === 8) {
      substitution(plays[counter]);
    }

    counter++;
  }

  plays.splice(0, counter + 1);
}

while (plays.length !== 0){
  for (let i = 0; i < 4; i++) {
    quarterStart();
    quarterEngine();
  }

  players.forEach((person) => {
    let finalStats = {};
    finalStats.Game_ID = person.game;
    finalStats.Player_ID = person.name;
    finalStats.Player_PlusMinus = person.plusMinus;
    finalArr.push(finalStats);
  })

  players = [];
}

// fs.writeFile('./final.json', JSON.stringify(finalArr), 'utf8');
const jsonData = fs.readFileSync(path.join(__dirname, './final.json'), { encoding : 'utf8'});
const options = {
   delimiter   : ",",
   wrap        : false
}

const x = csvjson.toCSV(jsonData, options);
fs.writeFile('./final.csv', x, 'utf8');
