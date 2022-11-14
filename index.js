import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import joi from 'joi';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import getMessage from './getMessage.js';


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());


const mongoClient = new MongoClient(process.env.URL_MONGO);
let db;
mongoClient.connect().then(()=>{
    db = mongoClient.db('chat-UOL');
});


const participantsSchema = joi.object({
    name: joi.string().required()
})
const messagesSchema = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type:  joi.string().required()
})


app.post('/participants', async (req,res) =>{

    try{
        const user = req.body;
        const validation = participantsSchema.validate(user);
        if(validation.error){
            res.sendStatus(409);
            return;
        }

        const participantExists = await db.collection('participants').findOne(user);
        if(participantExists){
            res.sendStatus(409);
            return;
        }

        const participantLogIn = {
            ...user,
            lastStatus: Date.now()
        }

        const hourToConnected = dayjs().format('HH:mm:ss');
        const statusMessage = {from: user.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: hourToConnected}

        await db.collection('participants').insertOne(participantLogIn)
        await db.collection('messages').insertOne(statusMessage)

        res.sendStatus(201)

    } catch(err){
        res.sendStatus(500);
    }

})
app.get('/participants', async (req,res) =>{
    
    try{
        const participants = await db.collection('participants').find().toArray();
        res.send(participants);
    } catch(error){
        res.sendStatus(500);
    }
})



app.post('/messages', async (req,res) =>{

    try{
        const user = req.headers.user;
        const message = req.body;

        const participantExists = await db.collection('participants').findOne({name:user});
        if (!participantExists){
            res.sendStatus(422);
            return;
        }

        const messageToCheck = {...message, from:user};
        const validation = messagesSchema.validate(messageToCheck);
        if (validation.error) {
            res.sendStatus(422);
            return;
        }

        const hourToConnected = dayjs().format('HH:mm:ss');
        const messageToPost = {...messageToCheck, time: hourToConnected}

        await db.collection('messages').insertOne(messageToPost);

        res.status(201).send()
    } catch(error){
        res.sendStatus(500);
    }
})
app.get('/messages', async (req,res) =>{
    try {
        const user = req.headers.user;
        const limit = req.query.limit;
        const messages = await db.collection('messages').find().toArray();
        const messageToShow = getMessage(messages, limit, user);

        res.send(messageToShow)

    } catch(error){
        res.sendStatus(500);
    }
})


app.post('/status', async (req,res) =>{
    try{
        const user = req.headers.user;
        const participantExists = await db.collection('participants').findOne({name:user});
        if (!participantExists){
            res.sendStatus(404);
            return;
        };

        const participant = {
            name:user,
            lastStatus: Date.now()
        };

        await db.collection('participants').updateOne({name:user}, { $set: participant });

        res.sendStatus(200);

    } catch(error){
        res.sendStatus(500);
    }
})

setInterval(removeLogOutUser, 15000);

async function removeLogOutUser(){
    try{
        const participants = await db.collection('participants').find().toArray();
        participants.find(async user => {
            const hourNow = Date.now()
            const timeValidate = hourNow - 10000;
            if(user.lastStatus < timeValidate && participants){
                await db.collection('participants').deleteOne({ name: user.name })
                const date = dayjs().format('HH:mm:ss')
                const statusMessage = {from: user.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: date}
                await db.collection('messages').insertOne(statusMessage);
            }
        })
    }catch(error){
        res.sendStatus(500);
    }
}

app.listen(process.env.PORT)
///mensagensdousuario.filter(condição para mensagem ser exibida).slice(-100)
