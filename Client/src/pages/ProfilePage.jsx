import React, { useContext, useState, useEffect } from 'react';
import assets from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/authContext';

const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);
  const [selectedPic, setSelectedPic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // set initial form fields when authUser becomes available
  useEffect(() => {
    if (authUser) {
      setName(authUser.fullName || '');
      setBio(authUser.bio || '');
    }
  }, [authUser]);

  // create preview URL and revoke on cleanup to avoid memory leaks
  useEffect(() => {
    if (!selectedPic) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedPic);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedPic]);

  // helper to read file as base64 and return a Promise
  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reader.abort();
        reject(new Error('Failed to read file.'));
      };
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { fullName: name, bio };

      if (selectedPic) {
        // WAIT for the file read to complete before calling updateProfile
        const base64Image = await readFileAsDataURL(selectedPic);
        payload.profilePic = base64Image;
      }

      // ensure updateProfile returns a Promise — await it
      await updateProfile(payload);

      // hide loader then navigate
      setLoading(false);
      navigate('/');
    } catch (err) {
      console.error('Profile update failed:', err);
      // keep UX responsive
      setLoading(false);
      // optionally show an error toast here if you have a toast util
    }
  };

  const ThemedLoader = () => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative flex items-center justify-center">
        {/* Outer gradient ring */}
        {/* <div className="w-16 h-16 rounded-full border-4 border-transparent animate-spin bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500" /> */}
        {/* Inner circle */}
        {/* <div className="absolute w-10 h-10 bg-black rounded-full flex items-center justify-center"> */}
        {/* Pulse dot */}
        {/* <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-400 to-violet-600 animate-pulse" />
        </div> */}
        <div className="loader absolute "> </div>
      </div>
    </div>
  );

  const ButtonSpinner = () => (
    <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
  );

  return (
    <div className="min-h-screen bg-cover bg-no-repeat flex items-center justify-center">
      {loading && <ThemedLoader />}

      <div className="w-5/6 max-w-2xl backdrop-blur-2xl text-gray-300 border-2 border-gray-600 flex items-center justify-between max-sm:flex-col-reverse rounded-lg">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 p-10 flex-1"
        >
          <h3 className="text-lg">Profile details</h3>

          <label
            htmlFor="avatar"
            className="flex items-center gap-3 cursor-pointer"
          >
            <input
              onChange={(e) => setSelectedPic(e.target.files[0])}
              type="file"
              id="avatar"
              accept="image/png, image/jpeg"
              hidden
            />
            <img
              src={previewUrl || assets.avatar_icon}
              alt="avatar preview"
              className={`h-12 w-12 ${previewUrl ? 'rounded-full' : ''}`}
            />
            <span>Upload Profile Image</span>
          </label>

          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            type="text"
            required
            placeholder="Your name"
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <textarea
            onChange={(e) => setBio(e.target.value)}
            value={bio}
            placeholder="Write profile bio"
            required
            className="p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            rows={4}
          />

          <button
            type="submit"
            disabled={loading}
            className={`flex items-center justify-center bg-gradient-to-r from-purple-400 to-violet-600 text-white p-2 rounded-full ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading && <ButtonSpinner />}
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>

        <img
          className="max-w-44 aspect-square rounded-full mx-10 max-sm:mt-10"
          src={authUser?.profilePic || assets.logo_icon}
          alt="current profile"
        />
      </div>
    </div>
  );
};

export default ProfilePage;
