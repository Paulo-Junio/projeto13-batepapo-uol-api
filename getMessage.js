function getMessage(messages, limit, user){
    const lastMessages =[];
    const messagesLength = messages.length;
    let begaing = 0;

    if (messagesLength > limit && limit){
        begaing = messagesLength - limit;
    } 
 
    for (let i = begaing ; i < messagesLength; i++){
        const message = messages[i];
        if (message.to === user || message.from === user || message.type === "status" || message.type === "message"){
             lastMessages.push(message)
        }

    }

    return lastMessages;
};

export default getMessage;