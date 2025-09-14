import React, { useContext, useEffect, useState } from 'react';
import Picker from 'emoji-picker-react';

import { messagesDummyData } from '../assets/assets';
import { useRef } from 'react';
import { formatDateLabel, formatTimeShort } from '../lib/utils.js';
import { chatContext } from '../../context/chatContext';
import { AuthContext } from '../../context/authContext';
import toast from 'react-hot-toast';
// ChatBox.js
import avatar_icon from '../assets/avatar_icon.png';
import arrow_icon from '../assets/arrow_icon.png';
import help_icon from '../assets/help_icon.png';
import gallery_icon from '../assets/gallery_icon.svg';
import send_button from '../assets/send_button.svg';
import logo_icon from '../assets/logo_icon.svg';

const ChatBox = () => {
  const {
    getMessages,
    messages,
    selectedUser,
    sendMessages,
    toTitleCase,
    typingUsers,
    setSelectedUser,
  } = useContext(chatContext);
  const { authUser, onlineUsers, socket } = useContext(AuthContext);
  const [input, setInput] = useState('');
  const scrollEnd = useRef();

  // inside the component
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null); // for caret insertion into the input
  const addEmojiAtCaret = (emoji) => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const start = inputEl.selectionStart;
    const end = inputEl.selectionEnd;

    // Insert emoji into input text
    const text = input;
    const newText = text.slice(0, start) + emoji + text.slice(end);

    setInput(newText);

    // Restore caret position after emoji
    requestAnimationFrame(() => {
      inputEl.selectionStart = inputEl.selectionEnd = start + emoji.length;
      inputEl.focus();
    });
  };
  // --- Helper: group messages by date label ---
  const groupedByDate = React.useMemo(() => {
    // copy & sort ascending
    const sorted = [...(messages || [])].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );

    const groups = [];
    let currentLabel = null;
    sorted.forEach((msg) => {
      const label = formatDateLabel(msg.createdAt);
      if (label !== currentLabel) {
        groups.push({ label, items: [msg] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].items.push(msg);
      }
    });
    return groups; // [{label: 'Today', items: [...]}, ...]
  }, [messages]);
  //handle send Message

  const handleSendMessage = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (input.trim() === '') return;
    try {
      await sendMessages({ text: input.trim() });
      setInput('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };
  // handle sending emoji
  const handleEmojiClick = (emojiData) => {
    // emojiData can be different shapes between versions; this covers common fields
    const emoji = emojiData?.emoji ?? emojiData?.native ?? emojiData;

    const el = inputRef.current;
    if (!el) {
      setInput((prev) => prev + emoji);
      setShowEmojiPicker(false);
      return;
    }

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const newVal = input.slice(0, start) + emoji + input.slice(end);
    setInput(newVal);

    // put caret after inserted emoji
    setTimeout(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    }, 0);

    setShowEmojiPicker(false);
  };

  // handle sending an image
  const handleSendingImages = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];

    if (!file) return;

    // ✅ Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (jpeg, png, jpg).');
      return;
    }

    // ✅ Check file size (in MB)
    const maxSizeMB = 4;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size is too large. Maximum ${maxSizeMB}MB allowed.`);
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessages({ image: reader.result });
      e.target.value = ''; // reset input
    };
    reader.readAsDataURL(file);
  };

  //realtime typing
  // add ref for typing timer
  const typingTimeoutRef = useRef(null);

  const handleTyping = (e) => {
    setInput(e.target.value);

    if (!socket || !selectedUser) return;

    console.log('emitting typing ->', selectedUser._id);
    socket.emit('typing', { to: selectedUser._id });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      console.log('emitting stopTyping ->', selectedUser._id);
      socket.emit('stopTyping', { to: selectedUser._id });
      typingTimeoutRef.current = null;
    }, 1000);
  };

  // use effect for close the emoji picker
  useEffect(() => {
    const handleClickOutside = () => {
      setShowEmojiPicker(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);
  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  {
    /* header area */
  }
  return selectedUser ? (
    <div className="h-full scroll-none border   ">
      <div className="h-[100%] border  overflow-scroll overflow-x-hidden relative backdrop-blur-lg  justify-between">
        <div className="flex  absolute left-[-16px] w-full items-center gap-3 py-3 px-4 mx-4 border-b border-stone-500 backdrop-blur-lg  rounded-lg">
          <img
            src={selectedUser.profilePic || avatar_icon}
            alt=""
            className="w-10 rounded-full"
          />
          <div className="w-[90%] overflow-hidden h-[50px] flex flex-col relative     ">
            <p className="flex-1  text-lg text-white flex items-center gap-2">
              {toTitleCase(selectedUser.fullName)}

              {onlineUsers.includes(selectedUser._id) ? (
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-grey-500"></span>
              )}
            </p>
            {typingUsers[selectedUser?._id] && (
              <div className=" text-sm text-gray-300 italic">
                typing{' '}
                <span className="typing  text-transparent ml-1">....</span>
              </div>
            )}
          </div>

          <img
            onClick={() => setSelectedUser(null)}
            src={arrow_icon}
            alt=""
            className="md:hidden max-w-7 cursor-pointer "
          />
          <img src={help_icon} alt="" className="max-md:hidden max-w-5" />
        </div>
        {/** Chat messages will go here */}
        <div
          className="flex flex-col mt-[25%]  lg:mt-[15%] h-[calc(100%-200px)]  lg:h-[calc(100%-150px)]    overflow-y-scroll p-3
pb-6"
        >
          {groupedByDate.map((group) => (
            <div key={group.label}>
              {/* date separator */}
              <div className="flex justify-center my-4">
                <span className="bg-gray-200/20 text-gray-300 text-xs px-3 py-1 rounded-full">
                  {group.label}
                </span>
              </div>

              {/* messages for that day */}
              {group.items.map((msg) => {
                const isSender = msg.senderId === authUser._id;
                return (
                  <div
                    key={msg._id}
                    className={`flex items-end gap-2 my-2 ${
                      isSender ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* avatar (left for receiver) */}
                    {!isSender && (
                      <img
                        src={selectedUser?.profilePic || avatar_icon}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}

                    {/* bubble + time/ticks */}
                    <div
                      className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}
                    >
                      {msg.image ? (
                        <img
                          className="w-[150px] h-[150px] rounded-lg"
                          src={msg.image}
                        />
                      ) : (
                        <div
                          className={`p-2 max-w-[200px] break-words rounded-lg text-white
                        ${isSender ? 'bg-violet-500/50 rounded-br-none text-right' : 'bg-[#472983] rounded-bl-none text-left'}`}
                        >
                          {msg.text}
                        </div>
                      )}

                      {/* time + ticks row */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-300">
                        <span className="text-gray-400">
                          {formatTimeShort(msg.createdAt)}
                        </span>

                        {/* show ticks only for sender */}
                        {isSender && (
                          <span className="text-gray-300">
                            {msg.seen ? (
                              <span className="text-blue-500">✓✓</span>
                            ) : msg.delivered ? (
                              <span>✓✓</span>
                            ) : (
                              <span>✓</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* avatar (right for sender) */}
                    {isSender && (
                      <img
                        src={authUser?.profilePic || avatar_icon}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <div ref={scrollEnd}></div>
        </div>
        {/** Message input area */}
        <div className="flex items-center z-100  gap-3 p-3 absolute bottom-0 w-full ">
          <div className="flex-1 flex items-center bg-gray-100/12 px-3 rounded-full relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Send a message"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                handleTyping(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 text-sm p-3 pl-10 border-none rounded-1g outline-none text-white placeholder-gray-400"
            />
            <div ref={emojiPickerRef} className=" absolute  ">
              {/* Emoji toggle button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // 🚀 stop bubbling up
                  setShowEmojiPicker((v) => !v);
                }}
                className="mr-2 text-xl"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx="12" cy="12" r="12" fill="#191A36" />
                  <path
                    d="M8.5 15C8.5 15 9.5 17 12 17C14.5 17 15.5 15 15.5 15"
                    stroke="#34B7F1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="9" cy="10" r="1" fill="#34B7F1" />
                  <circle cx="15" cy="10" r="1" fill="#34B7F1" />
                </svg>
              </button>

              {/* Emoji picker dropdown */}
              {showEmojiPicker && (
                <div
                  className="absolute bottom-12    z-50  bg-gray-900 shadow-lg rounded-xl p-2"
                  onClick={(e) => e.stopPropagation()} // 🚀 clicks inside picker don’t close it
                >
                  <Picker
                    width={window.innerWidth < 480 ? 260 : 280} // 📱 auto adjust for small screens
                    height={window.innerHeight < 700 ? 300 : 350} // 📱 adjust height on small devices
                    // className={`w-[280px] h-[300] sm:w-[240px] sm:h-[300px]`}
                    theme="dark"
                    onEmojiClick={(emojiData) =>
                      addEmojiAtCaret(emojiData.emoji)
                    } // ✅ caret insertion
                  />
                </div>
              )}
            </div>

            <input
              type="file"
              id="image"
              accept="image/png, image/jpeg"
              className="w-5 cursor-pointer mr-2 bg-amber-50"
              onChange={(e) => handleSendingImages(e)}
              hidden
            />
            <label htmlFor="image">
              <img
                src={gallery_icon}
                alt=""
                className="w-5 mr-2
cursor-pointer"
              />
            </label>
          </div>
          <img
            onClick={handleSendMessage}
            src={send_button}
            alt=""
            className="w-7 cursor-pointer"
          />
        </div>
      </div>
    </div>
  ) : (
    <div
      className="flex flex-col items-center justify-center gap-2 text-gray-500
bg-white/10 max-md:hidden"
    >
      <img src={logo_icon} className="max-w-16" alt="" />
      <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
    </div>
  );
};

export default ChatBox;
