import React, { useContext, useState } from 'react';
import { imagesDummyData } from '../assets/assets';
import { chatContext } from '../../context/chatContext';
import { AuthContext } from '../../context/authContext';
import { useEffect } from 'react';
import assets from '../assets/assets';
const RightSideBar = () => {
  const { selectedUser, messages, toTitleCase } = useContext(chatContext);
  const { logout, onlineUsers } = useContext(AuthContext);
  const [msgImages, setMsgImages] = useState([]);
  useEffect(() => {
    setMsgImages(messages.filter((msg) => msg.image).map((msg) => msg.image));
  }, [messages]);

  return (
    selectedUser && (
      <div
        className={`bg-[#8185B2]/10 text-white w-full relative overflow-y-scroll ${selectedUser ? 'max-md:hidden' : ''}`}
      >
        <div className="pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto ">
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            alt=""
            className="w-20 aspect-[1/1] rounded-full"
          />
          <h1
            className="px-10 text-xl font-medium mx-auto flex items-center
gap-2"
          >
            {onlineUsers.includes(selectedUser._id) && (
              <p className="w-2 h-2 rounded-full bg-green-500"></p>
            )}

            {toTitleCase(selectedUser?.fullName)}
          </h1>
          <p className="px-10 mx-auto">{selectedUser?.bio}</p>
        </div>
        <hr className="border-[#ffffff50] my-4" />
        <div className="px-5 text-xs">
          <p>Media</p>
          <div className="mt-2  h-[220px] max-h-[250px] overflow-y-scroll grid grid-cols-3 gap-2 opacity-80">
            {[...msgImages].reverse().map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer h-[100px] rounded"
              >
                <img src={url} className="h-[100%] rounded-md" alt="" />
              </div>
            ))}
          </div>
        </div>
        <button
          className=" absolute bottom-5 left-1/2 transform -translate-x-1/2
bg-gradient-to-r from-purple-400 to-violet-600 text-white border-none
text-sm font-light py-2 px-20 rounded-full cursor-pointer"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    )
  );
};

export default RightSideBar;
