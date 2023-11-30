import { TextField, Button, IconButton } from "@mui/material";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PhoneIcon from "@mui/icons-material/Phone";
import React, { useEffect, useRef, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import io from "socket.io-client";
import "./App.css";
const Peer = window.SimplePeer;

const BASE_URL = process.env.REACT_APP_BASE_URL;

// console.log(BASE_URL);

const socket = io.connect(`${BASE_URL}`);
function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [callerName, setCallerName] = useState("");
  const [error, setError] = useState("");
  const [connectedMsg, setConnectedMsg] = useState("Call is connected!!");

  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const connectionRef = useRef();


  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((str) => {
        console.log(str);
        setStream(str);
        console.log(myVideo.current);
        if (myVideo.current) {
          
          myVideo.current.srcObject = str;
          console.log("MediaStream object:", myVideo.current.srcObject);
        }
      })
      .catch((error) => {
        console.error("Error getting user media:", error);
      });
  }, [myVideo]);

  useEffect(() => {

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("endCall", () => {
      window.location.reload();
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerName(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    if (!name) {
      setError("Please enter your name before calling.");
      return;
    } else if (!idToCall) {
      setError("Please enter another user's id to call.");
      return;
    }
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
    // console.log(connectionRef.current);
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
    // console.log(connectionRef.current);
  };

  const handleCopyId = () => {
    if (!name) {
      setError("Please enter your name before copying the ID.");
      return;
    }
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
    socket.emit("endCall", { id: idToCall });
    // window.location.reload();
  };

  return (
    <>
      <h1 style={{ textAlign: "center", color: "#fff" }}>CallWave</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && (
              <>
                <div className="overlay">{name}</div>
                <video
                  playsInline
                  muted
                  ref={myVideo}
                  autoPlay
                  style={{ width: "300px" }}
                />
              </>
            )}
          </div>
          <div className="video">
            {callAccepted && !callEnded ? (
              <>
                <div className="overlay">{callerName}</div>
                <video
                  playsInline
                  ref={userVideo}
                  autoPlay
                  style={{ width: "300px" }}
                />
              </>
            ) : null}
          </div>
        </div>
        <div className="myId">
          <TextField
            id="filled-basic"
            label="Name"
            variant="standard"
            size="small"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            style={{ marginBottom: "20px" }}
          />
          <CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AssignmentIcon fontSize="large" />}
              onClick={handleCopyId}
            >
              Copy ID
            </Button>
          </CopyToClipboard>

          <TextField
            id="filled-basic"
            label="ID to call"
            variant="standard"
            size="small"
            value={idToCall}
            onChange={(e) => {
              setIdToCall(e.target.value);
              setError("");
            }}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <>
                <p style={{ color: "green" }}>{connectedMsg}</p>
                <Button variant="contained" color="error" onClick={leaveCall}>
                  End Call
                </Button>
              </>
            ) : (
              <>
                <IconButton
                  color="primary"
                  aria-label="call"
                  onClick={() => {
                    callUser(idToCall);
                    setIdToCall("");
                  }}
                >
                  <PhoneIcon fontSize="large" />
                </IconButton>
                {idToCall}
              </>
            )}
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{callerName} is calling...</h1>
              <Button variant="contained" color="success" onClick={answerCall}>
                Answer
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default App;
