import React, { useState, useEffect, useCallback } from "react";
import { useSocket } from '../socket'
import useLocalStorage from "../../hooks/useLocalStorage";
import PresentField from "./PresentField";
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import { useNotifications } from '@mantine/notifications';

function Tabs(props) {
    //tabs
    const [toggleState, setToggleState] = useState(1);
    const toggleTab = (index) => setToggleState(index);
    //cards
    const [whiteCards, setWhiteCards] = useState([])
    const [redCards, setRedCards] = useState([])
    const [whiteDupe, setWhiteDupe] = useState(false)
    const [redDupe, setRedDupe] = useState(false) 
    const [present, setPresent] = useState([])
    //for the button
    const [show, setShow] = useState(false)
    //pointer is for the function that place cards in their new location
    const pointer = {array:{white:whiteCards, red:redCards, present:present}, setArray:{white:setWhiteCards,red:setRedCards,present:setPresent}}
    //mantine notification
    const notifications = useNotifications()
    //socket
    const socket = useSocket()
    const [id] = useLocalStorage("id")
    const [seed] = useLocalStorage("seed")
    const [username] = useLocalStorage("user")


    function dupe(card, array, setDupe){
        const cardString = JSON.stringify(card)//the (Custom card)s have an "n" value that makes them different when stringified
        for(let x=0;x<array.length;x++){
            if (cardString===JSON.stringify(array[x])){
                setDupe(true)
                return true
            }
        }
        setDupe(false)
        return false
    }

    const pull = useCallback((color, array, setArray, setDupe)=>{
        socket.emit("pull", {color:color}, (card)=>{
            if(dupe(card, array, setDupe))return//I think it is fixed, not sure
            setArray((prevCards)=>{return [...prevCards, card]})
        })
    },[socket])

    useEffect(()=>{
        console.log(socket)
        if (socket==null)return
        const data = props.QS
        socket.emit("gamejoin", data.roomId, id, username, seed)
        socket.on("init", ()=>{
            for(let x=0; x<15; x++){
                pull("white", whiteCards, setWhiteCards, setWhiteDupe)
            }
            for(let x=0; x<10; x++){
                pull("red", redCards, setRedCards, setRedDupe)
            }
        })
    },[socket])

    useEffect(()=>{
        if (whiteDupe===true){
            pull("white", whiteCards, setWhiteCards, setWhiteDupe)
        }
        if (redDupe===true){
            pull("red", redCards, setRedCards, setRedDupe)
        }
    }, [whiteDupe,redDupe])

    useEffect(()=>{
        if(present.length === 2){
            setShow(true)
        } else{
            setShow(false)
        }
    }, [present])

    function play(source,destination, index){
        let sudoResult = {source:{droppableId:source, index:index},destination:{droppableId:destination, index:0}}
        reOrder(sudoResult)
    }
    function update(e, index, color){
        let array = Array.from(pointer["array"][color])
        let setArray = pointer["setArray"][color]
        array[index].value = e.target.innerText
        setArray(array)
    }

    function limit(e, index, color){//it's a limit function... ba dum tss
        
        if(e.target.innerText.length >=36 && e.key!=="Backspace")e.preventDefault()
    }
    function reOrder(result){
        const source = Array.from(pointer["array"][result.source.droppableId])
        source[result.source.index].display = source[result.source.index].value
        const setSource = pointer["setArray"][result.source.droppableId]
        const [removedItem] = source.splice(result.source.index, 1)
        if(result.destination.droppableId === result.source.droppableId){
            source.splice(result.destination.index, 0, removedItem)
            setSource(source)
        } else {
            if((removedItem.color === "white" && result.destination.droppableId === "red") ||(removedItem.color === "red" && result.destination.droppableId === "white")){
                notifications.showNotification({
                    title: 'Whoopsies',
                    message: `${removedItem.color} cards do not go with the ${result.destination.droppableId} cards`,
                    color:"red",
                    style:{ textAlign: 'left' }//this is not currently working btw, so I jut manually added it to .mantine-1yg4h9z
                })
                return
            }
            const destination = Array.from(pointer["array"][result.destination.droppableId])
            const setDestination = pointer["setArray"][result.destination.droppableId]
            destination.splice(result.destination.index, 0, removedItem)
            setSource(source)
            setDestination(destination)
        }
        
    }

    return (
        <DragDropContext onDragEnd={reOrder}>
            <PresentField mountButton={show}>
                <Droppable droppableId="present" direction="horizontal">
                    {(provided)=>(
                        <div id="played-cards" className="scrollmenu" {...provided.droppableProps} ref={provided.innerRef} style={{width:"100%", height:"auto"}}>
                            {present.map((card,index) => {return (
                                <Draggable key={"present "+index} draggableId={"present "+index} index={index}>
                                    {(provided)=>(
                                        <div {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef} className={card.color + " card presented"} onDoubleClick={()=>{play("present", card.color,index)}}>
                                            {card.text}{/*note to self, I will have to change the class thing*/}
                                            {card.Custom ? <span contentEditable="true" onKeyUp={e => update(e, index, card.color)} onKeyDown={limit}>{card.display}</span>:""} 
                                        </div> 
                                    )}
                                </Draggable>
                            )})}
                            <div className="white card" style={{maxWidth:"9rem", opacity:"0"}}>
                                this is a placeholder card
                            </div>
                            {provided.placeholder} 
                        </div>
                    )}
                </Droppable>
            </PresentField>
            <div className="tabs-container">
            <div className="bloc-tabs">
                <button
                className={toggleState === 1 ? "tabs active-tabs" : "tabs"}
                onClick={() => toggleTab(1)}
                >
                white cards
                </button>
                <button
                className={toggleState === 2 ? "tabs active-tabs" : "tabs"}
                onClick={() => toggleTab(2)}
                >
                red cards
                </button>
            </div>

            <div className="content-tabs">
                    <div
                    className={(toggleState === 1 ? "content  active-content" : "content")}
                    >
                        <Droppable droppableId="white" direction="horizontal">
                            {(provided)=>(
                            <div className="scrollmenu hand" {...provided.droppableProps} ref={provided.innerRef}>
                                {whiteCards.map((card,index) => {return (
                                    <Draggable key={"white "+index} draggableId={"white "+index} index={index}>
                                        {(provided)=>(
                                            <div {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef} className="white card" onDoubleClick={()=>{play("white","present",index)}}>
                                                {card.text}
                                                {card.Custom ? <span contentEditable="true" onKeyUp={e => update(e, index, "white")} onKeyDown={limit}>{card.display}</span>:""} 
                                            </div>
                                    )}
                                </Draggable>
                            )})}
                            {provided.placeholder} 
                        </div>
                        )}
                    </Droppable>
                </div>

                <div
                className={(toggleState === 2 ? "content  active-content" : "content")}
                >
                    <Droppable droppableId="red" direction="horizontal">
                        {(provided)=>(
                        <div className="scrollmenu hand" {...provided.droppableProps} ref={provided.innerRef}>
                            {redCards.map((card,index) => {return (
                                <Draggable key={"red "+index} draggableId={"red "+index} index={index}>
                                    {(provided)=>(
                                        <div {...provided.draggableProps} {...provided.dragHandleProps} ref={provided.innerRef} className="red card" onDoubleClick={()=>{play("red","present",index)}}>
                                            {card.text}
                                            {card.Custom ? <span contentEditable="true" onKeyUp={e =>update(e, index, "red")} onKeyDown={limit}>{card.display}</span>:""}
                                        </div>
                                    )}
                                </Draggable>
                            )})}
                            {provided.placeholder} 
                        </div>
                        )}
                    </Droppable>
                </div>
            </div>
            </div>
        </DragDropContext>
    );
}

export default Tabs;