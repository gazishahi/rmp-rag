"use client";
import { useState } from "react";
import {
  Box,
  Stack,
  TextField,
  Button,
  Paper,
  Typography,
} from "@mui/material";
import Markdown from "react-markdown";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the Rate My Professor support assistant! How can I help you today?",
    },
  ]);

  const [message, setMessage] = useState("");
  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setMessage("");

    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#d1ebe5"
    >
      <Paper
        elevation={3}
        sx={{
          width: 500,
          height: 700,
          p: 3,
          borderRadius: 4,
          bgcolor: "#d1ebe5",
        }}
      >
        <Stack direction={"column"} spacing={2} height="100%">
          <Typography variant="h5" color="#0a0a0a" textAlign="center">
            Rate My Professor Chatbot
          </Typography>
          <Stack
            direction={"column"}
            spacing={2}
            flexGrow={1}
            overflow="auto"
            sx={{
              maxHeight: "100%",
              p: 1,
              bgcolor: "#e7e4ed",
              borderRadius: 2,
            }}
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  message.role === "assistant" ? "flex-start" : "flex-end"
                }
              >
                <Box
                  bgcolor={message.role === "assistant" ? "#2cb8a0" : "#7c84a6"}
                  color="white"
                  borderRadius={7}
                  p={3}
                  maxWidth="75%"
                >
                  <Markdown>{message.content}</Markdown>
                </Box>
              </Box>
            ))}
          </Stack>
          <Stack direction={"row"} spacing={2}>
            <TextField
              label="Message"
              fullWidth
              variant="outlined"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{
                bgcolor: "#e6ebea",
                borderRadius: 2,
                input: { color: "black" },
                label: { color: "gray" },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={sendMessage}
              sx={{ borderRadius: 2 }}
            >
              Send
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
