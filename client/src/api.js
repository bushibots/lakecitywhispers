export const API_URL = 'http://127.0.0.1:5000/api';

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
        // Ping session to update last_active and fetch current display_name
        try {
            const res = await fetch(`${API_URL}/users/session`, {
                method: 'POST',
                headers: { 'Authorization': token }
            });
            const data = await res.json();
            if (data.session_token && data.session_token !== token) {
                token = data.session_token;
                localStorage.setItem('jluwhisper_session', token);
            }
            if (data.display_name) {
                localStorage.setItem('jluwhisper_identity', data.display_name);
                localStorage.setItem('jluwhisper_registered', data.is_registered);
                if (data.is_admin !== undefined) localStorage.setItem('jluwhisper_admin', data.is_admin);
            }
        } catch (e) {
            console.error(e);
        }
    }
    return token;
};

export const register = async (username, password) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.session_token) {
            localStorage.setItem('jluwhisper_session', data.session_token);
            localStorage.setItem('jluwhisper_registered', 'true');
            if (data.is_admin !== undefined) localStorage.setItem('jluwhisper_admin', data.is_admin);
            // the backend might not return display_name on register, but it will be refetched
        }
        return data;
    } catch (e) {
        console.error(e);
        return { error: 'Network error' };
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

export const fetchPosts = async (topic = '') => {
    const token = await getSessionToken();
    try {
        const url = topic ? `${API_URL}/posts?topic=${encodeURIComponent(topic)}` : `${API_URL}/posts`;
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

export const createPost = async (content, topic = 'General', pollOptions = [], imageUrl = null, audioUrl = null) => {
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
                audio_url: audioUrl
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

export const getMessages = async (convId) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/messages/${convId}`, {
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

export const adminToggleBanUser = async (username) => {
    const token = await getSessionToken();
    try {
        const res = await fetch(`${API_URL}/admin/users/${username}/toggle_ban`, {
            method: "POST",
            headers: { "Authorization": token }
        });
        return await res.json();
    } catch (error) {
        console.error("Error toggling ban:", error);
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

