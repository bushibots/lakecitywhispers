export const API_URL = import.meta.env.VITE_API_URL || 'https://lakecity-whispers-backend.onrender.com/api';

let sessionPinged = false;

export const getSessionToken = async () => {
    let token = localStorage.getItem('jluwhisper_session');
    if (!token) {
        try {
            const res = await fetch(`${API_URL}/users/session`, { method: 'POST' });
            const data = await res.json();
            token = data.session_token;
            localStorage.setItem('jluwhisper_session', token);
            localStorage.setItem('jluwhisper_identity', data.display_name);
            localStorage.setItem('jluwhisper_registered', data.is_registered);
            if (data.is_admin !== undefined) localStorage.setItem('jluwhisper_admin', data.is_admin);
        } catch (error) {
            console.error('Error fetching session:', error);
        }
    } else {
        // Ping session in background to update last_active, only once per load
        if (!sessionPinged) {
            sessionPinged = true;
            fetch(`${API_URL}/users/session`, {
                method: 'POST',
                headers: { 'Authorization': token }
            }).then(res => res.json()).then(data => {
                if (data.session_token && data.session_token !== token) {
                    localStorage.setItem('jluwhisper_session', data.session_token);
                }
                if (data.display_name) {
                    localStorage.setItem('jluwhisper_identity', data.display_name);
                    localStorage.setItem('jluwhisper_registered', data.is_registered);
                    if (data.is_admin !== undefined) localStorage.setItem('jluwhisper_admin', data.is_admin);
                }
            }).catch(e => console.error(e));
        }
    }
    return token;
};

export const apiFetch = async (endpoint, options = {}) => {
    const token = await getSessionToken();
    const headers = {
        'Authorization': token,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });
        return await res.json();
    } catch (e) {
        console.error(`API Fetch Error [${endpoint}]:`, e);
        return { error: 'Network error' };
    }
};

export const register = async (username, password, customAlias = '', avatarState = null) => {
    const token = await getSessionToken();
    try {
        const payload = { username, password, custom_alias: customAlias };
        if (avatarState) payload.avatar = avatarState;
        
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.session_token) {
            localStorage.setItem('jluwhisper_session', data.session_token);
            localStorage.setItem('jluwhisper_registered', 'true');
            if (data.is_admin !== undefined) localStorage.setItem('jluwhisper_admin', data.is_admin);
        }
        return data;
    } catch (e) {
        console.error(e);
        return { error: 'Network Error' };
    }
};

export const login = async (username, password) => {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.session_token) {
            localStorage.setItem('jluwhisper_session', data.session_token);
            if (data.display_name) localStorage.setItem('jluwhisper_identity', data.display_name);
            localStorage.setItem('jluwhisper_registered', 'true');
        }
        return data;
    } catch (e) {
        console.error(e);
        return { error: 'Network error' };
    }
};

export const recoverAccount = async (username, recoveryKey, newPassword) => {
    try {
        const res = await fetch(`${API_URL}/auth/recover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, recovery_key: recoveryKey, new_password: newPassword })
        });
        const data = await res.json();
        if (data.session_token) {
            localStorage.setItem('jluwhisper_session', data.session_token);
            if (data.display_name) localStorage.setItem('jluwhisper_identity', data.display_name);
            localStorage.setItem('jluwhisper_registered', 'true');
        }
        return data;
    } catch (e) {
        console.error(e);
        return { error: 'Network error' };
    }
};

export const fetchPosts = async (topic = '', searchQuery = '', handle = 'global', limit = 20, before = '') => {
    const token = await getSessionToken();
    try {
        let url = `${API_URL}/posts?limit=${limit}&`;
        if (topic) url += `topic=${encodeURIComponent(topic)}&`;
        if (searchQuery) url += `q=${encodeURIComponent(searchQuery)}&`;
        if (handle) url += `handle=${encodeURIComponent(handle)}&`;
        if (before) url += `before=${encodeURIComponent(before)}&`;
        
        const res = await fetch(url, {
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        return data.posts || [];
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
};

export const votePost = async (postId, type) => {
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type })
        });
        return await res.json();
    } catch (error) {
        console.error('Error voting:', error);
        return null;
    }
};

export const deletePost = async (postId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const editPost = async (postId, content) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ content })
        });
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const pinPost = async (postId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/pin`, {
            method: 'POST',
            headers: { 'Authorization': token }
        });
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const recordView = async (postId) => {
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        return await res.json();
    } catch (error) {
        console.error('Error recording view:', error);
        return null;
    }
};

export const createPost = async (content, topic = 'General', pollOptions = [], imageUrl = null, audioUrl = null, handle = 'global', isAnnouncement = false) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ 
                content, 
                topic, 
                poll_options: pollOptions,
                image_url: imageUrl,
                audio_url: audioUrl,
                handle,
                is_announcement: isAnnouncement
            })
        });
        return await res.json();
    } catch (error) {
        console.error('Error creating post:', error);
        return null;
    }
};

export const uploadFile = async (file) => {
    const token = await getSessionToken();
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': token
            },
            body: formData
        });
        const data = await res.json();
        return data.url || null;
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
};

export const fetchInstagramProfile = async (username) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/upload/instagram`, {
            method: 'POST',
            headers: { 
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        return data; // returns { url: ... } or { error: ... }
    } catch (error) {
        console.error('Insta fetch error:', error);
        return { error: 'Network error' };
    }
};

export const votePoll = async (postId, optionId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/poll_vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ option_id: optionId })
        });
        return await res.json();
    } catch (error) {
        console.error('Error voting poll:', error);
        return null;
    }
};

export const fetchReplies = async (postId) => {
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/replies`);
        const data = await res.json();
        return data.replies || [];
    } catch (error) {
        console.error('Error fetching replies:', error);
        return [];
    }
};

export const createReply = async (postId, content) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/posts/${postId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ content })
        });
        return await res.json();
    } catch (error) {
        console.error('Error creating reply:', error);
        return null;
    }
};

// --- Admin Endpoints ---
export const adminForgePost = async (content, topic = 'General', authorName = '') => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/forge_post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ content, topic, author_name: authorName })
        });
        return await res.json();
    } catch (error) {
        console.error('Error forging post:', error);
        return { error: 'Failed' };
    }
};

export const fetchAdminDatingProfiles = async () => {
    try {
        const token = await getSessionToken();
        const res = await fetch(`${API_URL}/admin/dating_profiles`, {
            headers: {
                'Authorization': token
            }
        });
        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error fetching dating profiles:", error);
        return [];
    }
};

export const fetchAdminSwipes = async () => {
    try {
        const token = await getSessionToken();
        const res = await fetch(`${API_URL}/admin/swipes`, {
            headers: {
                'Authorization': token
            }
        });
        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error fetching swipes:", error);
        return [];
    }
};

export const fetchAdminMedia = async () => {
    try {
        const token = await getSessionToken();
        const res = await fetch(`${API_URL}/admin/media`, {
            headers: {
                'Authorization': token
            }
        });
        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error fetching media:", error);
        return [];
    }
};

export const adminDeleteDatingProfile = async (userId) => {
    try {
        const token = await getSessionToken();
        const res = await fetch(`${API_URL}/admin/dating_profiles/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': token
            }
        });
        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error deleting dating profile:", error);
        return { error: 'Failed to delete' };
    }
};

export const adminToggleDatingProfile = async (userId) => {
    try {
        const token = await getSessionToken();
        const res = await fetch(`${API_URL}/admin/dating_profiles/${userId}/toggle`, {
            method: 'POST',
            headers: {
                'Authorization': token
            }
        });
        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error toggling dating profile:", error);
        return { error: 'Failed to toggle' };
    }
};

export const sendAdminBroadcast = async (message) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ message })
        });
        return await res.json();
    } catch (e) {
        console.error(e);
        return { error: 'Network error' };
    }
};

export const fetchAdminConversations = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/conversations`, {
            headers: { 'Authorization': token }
        });
        const data = await res.json();
        return data.conversations || [];
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const fetchAdminDashboard = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/dashboard`, {
            headers: { 'Authorization': token }
        });
        if (!res.ok) throw new Error('Unauthorized');
        return await res.json();
    } catch (error) {
        console.error('Error fetching admin dashboard:', error);
        return null;
    }
};

export const adminDeletePost = async (postId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/posts/${postId}/delete`, {
            method: 'POST',
            headers: { 'Authorization': token }
        });
        return await res.json();
    } catch (error) {
        console.error('Error deleting post:', error);
        return null;
    }
};

export const adminBanUser = async (username) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/users/${username}/ban`, {
            method: 'POST',
            headers: { 'Authorization': token }
        });
        return await res.json();
    } catch (error) {
        console.error('Error banning user:', error);
        return null;
    }
};

export const adminUpdateStats = async (postId, stats) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/posts/${postId}/edit_stats`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            },
            body: JSON.stringify(stats)
        });
        return await res.json();
    } catch (error) {
        console.error('Error updating stats:', error);
        return null;
    }
};

export const requestMessage = async (postId, content) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ post_id: postId, content })
        });
        return await res.json();
    } catch (error) {
        console.error("Error requesting message:", error);
        return null;
    }
};

export const requestSupportMessage = async (content) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/support`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ content })
        });
        return await res.json();
    } catch (error) {
        console.error("Error requesting support:", error);
        return null;
    }
};

export const getConversations = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/conversations`, {
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error fetching conversations:", error);
        return null;
    }
};

export const acceptRequest = async (convId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/${convId}/accept`, {
            method: "POST",
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error accepting request:", error);
        return null;
    }
};

export const rejectRequest = async (convId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/${convId}/reject`, {
            method: "POST",
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error rejecting request:", error);
        return null;
    }
};

export const getMessages = async (convId, before = null, limit = 30) => {
    const token = await getSessionToken();
    try {
        let url = `${API_URL}/messages/${convId}?limit=${limit}`;
        if (before) {
            url += `&before=${encodeURIComponent(before)}`;
        }
        const res = await fetch(url, {
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error fetching messages:", error);
        return null;
    }
};

export const sendMessage = async (convId, content) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/${convId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ content })
        });
        return await res.json();
    } catch (error) {
        console.error("Error sending message:", error);
        return null;
    }
};


export const fetchAdminUsers = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error fetching admin users:", error);
        return null;
    }
};

export const forceAdminMatch = async (username1, username2) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/dating/force_match`, {
            method: 'POST',
            headers: { 
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username1, username2 })
        });
        return await res.json();
    } catch (error) {
        console.error('Error forcing match:', error);
        return { error: 'Network error' };
    }
};

export const adminToggleBanUser = async (userId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/toggle_ban`, {
            method: 'POST',
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error toggling ban:", error);
        return null;
    }
};

export const adminTogglePermanentBot = async (userId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/toggle_permanent`, {
            method: 'POST',
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error toggling permanent bot:", error);
        return null;
    }
};

export const fetchAdminSettings = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/settings`, {
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error fetching settings:", error);
        return null;
    }
};

export const fetchPublicConfig = async () => {
    try {
        const res = await fetch(`${API_URL}/config`);
        return await res.json();
    } catch (error) {
        console.error("Error fetching config:", error);
        return {};
    }
};

export const updateAdminSettings = async (settings) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify(settings)
        });
        return await res.json();
    } catch (error) {
        console.error("Error updating settings:", error);
        return null;
    }
};

export const fetchAdminAllPosts = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/posts/all`, {
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error fetching all posts:", error);
        return null;
    }
};

export const fetchPostAuthor = async (postId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/posts/${postId}/author`, {
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error fetching post author:", error);
        return null;
    }
};


export const fetchDailyPrompt = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/daily_prompt`, {
            headers: { "Authorization": token }
        });
        const data = await res.json();
        return data.post;
    } catch (error) {
        console.error("Error fetching daily prompt:", error);
        return null;
    }
};

export const regenerateDailyPrompt = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/daily_prompt/regenerate`, {
            method: "POST",
            headers: { "Authorization": token }
        });
        const data = await res.json();
        return data.prompt;
    } catch (error) {
        console.error("Error regenerating daily prompt:", error);
        return null;
    }
};



export const fetchMe = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/me`, {
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error fetching me:", error);
        return null;
    }
};

export const fetchUserProfile = async (username) => {
    try {
        const res = await fetch(`${API_URL}/users/${username}`);
        return await res.json();
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return null;
    }
};

export const regenerateIdentity = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/me/identity`, {
            method: "POST",
            headers: { "Authorization": token }
        });
        const data = await res.json();
        if (data.display_name) {
            localStorage.setItem("jluwhisper_identity", data.display_name);
        }
        return data;
    } catch (error) {
        console.error("Error regenerating identity:", error);
        return { error: "Network error" };
    }
};

export const changePassword = async (old_password, new_password) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/me/password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ old_password, new_password })
        });
        return await res.json();
    } catch (error) {
        console.error("Error changing password:", error);
        return { error: "Network error" };
    }
};

export const deleteAccount = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/me`, {
            method: "DELETE",
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error deleting account:", error);
        return { error: "Network error" };
    }
};



export const blockUser = async (convId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/block/${convId}`, {
            method: "POST",
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        return { error: "Network error" };
    }
};

export const deleteConversation = async (convId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/conversation/${convId}`, {
            method: "DELETE",
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        return { error: "Network error" };
    }
};

export const unsendMessage = async (msgId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/${msgId}`, {
            method: "DELETE",
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        return { error: "Network error" };
    }
};



export const fetchNotifications = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/notifications`, { headers: { "Authorization": token } });
        return await res.json();
    } catch (error) { return []; }
};

export const markNotificationsRead = async () => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/notifications/read`, { method: "POST", headers: { "Authorization": token } });
        return await res.json();
    } catch (error) { return { error: "Network error" }; }
};

export const fetchTrending = async () => {
    try {
        const res = await fetch(`${API_URL}/explore/trending`);
        return await res.json();
    } catch (error) { return []; }
};

export const searchPosts = async (query) => {
    try {
        const res = await fetch(`${API_URL}/explore/search?q=${encodeURIComponent(query)}`);
        return await res.json();
    } catch (error) { return []; }
};



export const fetchSidebarStats = async () => {
    try {
        const res = await fetch(`${API_URL}/sidebar/stats`);
        return await res.json();
    } catch (error) { return { total_posts_today: 0, online_users: 0, trending_tags: [] }; }
};

export const fetchSidebarPolls = async () => {
    try {
        const res = await fetch(`${API_URL}/sidebar/polls`);
        return await res.json();
    } catch (error) { return []; }
};



export const adminSpawnBots = async (count, topic) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/bots/spawn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ count, topic })
        });
        return await res.json();
    } catch (error) {
        console.error('Error spawning bots:', error);
        return { error: 'Network error' };
    }
};


export const changeUsername = async (newUsername, password) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/settings/change_username`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ new_username: newUsername, password })
        });
        return await res.json();
    } catch (error) {
        return { error: 'Network error' };
    }
};


export const changeAlias = async (newAlias) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/settings/change_alias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ new_alias: newAlias })
        });
        return await res.json();
    } catch (error) {
        return { error: 'Network error' };
    }
};


export const adminWipeUser = async (username) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/users/${username}/wipe`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        return await res.json();
    } catch (error) {
        return { error: 'Network error' };
    }
};

export const adminBulkWipeUsers = async (userIds) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/users/bulk-wipe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ user_ids: userIds })
        });
        return await res.json();
    } catch (error) {
        return { error: 'Network error' };
    }
};

export const fetchAdminIdentityLogs = async (page = 1) => {
    try {
        const token = await getSessionToken();
        const res = await fetch(`${API_URL}/admin/identity_logs?page=${page}`, {
            headers: { 'Authorization': token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error fetching identity logs:", error);
        return { error: 'Failed to fetch' };
    }
};

