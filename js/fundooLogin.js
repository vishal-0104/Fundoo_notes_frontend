document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("fundoo-login-form");
    const forgotPasswordLink = document.getElementById("forgotPasswordLink");
    const sendResetCodeBtn = document.getElementById("sendResetCode");
    const resetPasswordBtn = document.getElementById("resetPasswordBtn");

    const forgotPasswordModal = new bootstrap.Modal(document.getElementById("forgotPasswordModal"));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById("resetPasswordModal"));

    let resetEmail = "";

    // 🔑 Handle Login
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("floatingInput").value.trim();
        const password = document.getElementById("floatingPassword").value.trim();

        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }

        
        fetch("http://localhost:3000/api/v1/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: { email, password } })
        })
        .then(response => response.json())
        .then(data => {
            if (data.token) {
                localStorage.setItem("jwtToken", data.token);
                localStorage.setItem("userEmail", data.user.email);
                localStorage.setItem("userName", data.user.name);
                alert("Login successful!");
                window.location.href = "../pages/fundooDashboard.html";
            } else {
                alert("Login failed: " + (data.error || "Invalid credentials"));
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Something went wrong. Please try again.");
        });
    });

    // 🔑 Handle Forgot Password
    forgotPasswordLink.addEventListener("click", function () {
        forgotPasswordModal.show();
    });

    sendResetCodeBtn.addEventListener("click", function () {
        resetEmail = document.getElementById("forgotEmail").value.trim();

        if (!resetEmail) {
            alert("Please enter your email.");
            return;
        }

        fetch("http://localhost:3000/api/v1/users/forgot_password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: { email: resetEmail } })  
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("OTP has been sent to your email.");

                // ✅ Ensure user_id is present before storing
                if (data.user_id) {
                    localStorage.setItem("resetUserId", data.user_id);  
                    console.log("Stored User ID:", data.user_id);
                } else {
                    alert("Error: User ID is missing in response.");
                    return;
                }

                forgotPasswordModal.hide();
                resetPasswordModal.show();
            } else {
                alert("Error: " + (data.error || "Failed to send OTP."));
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Something went wrong. Please try again.");
        });
    });

    // 🔑 Handle Reset Password
    resetPasswordBtn.addEventListener("click", function () {
        const otp = document.getElementById("otpCode").value.trim();
        const newPassword = document.getElementById("newPassword").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();
        const userId = localStorage.getItem("resetUserId");  

        console.log("Retrieved User ID:", userId); // ✅ Debugging check

        if (!otp || !newPassword || !confirmPassword) {
            alert("All fields are required.");
            return;
        }

        if (newPassword !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        if (!userId) {
            alert("Error: User ID is missing. Please request OTP again.");
            return;
        }

        fetch(`http://localhost:3000/api/v1/users/reset_password/${userId}`, {  // ✅ Corrected API URL
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                user: {  
                    new_password: newPassword, 
                    otp: otp 
                }
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Password reset successfully!");
                localStorage.removeItem("resetUserId");  // ✅ Clear stored user ID
                resetPasswordModal.hide();
                window.location.href = "fundooLogin.html";  
            } else {
                alert("Error: " + (data.error || "Failed to reset password."));
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Something went wrong. Please try again.");
        });
    });

});
