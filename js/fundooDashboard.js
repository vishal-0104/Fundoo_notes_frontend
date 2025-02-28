document.addEventListener("DOMContentLoaded", function () {
    const noteInput = document.getElementById("noteInput");
    const searchInput = document.getElementById("searchInput");
    const notesGrid = document.querySelector(".fundoo-dash-notes-grid");
    const createNoteSection = document.querySelector(".fundoo-dash-create-note");
    const apiUrl = "http://localhost:3000/api/v1/notes";
    const authToken = localStorage.getItem("jwtToken");
    const noteModal = new bootstrap.Modal(document.getElementById("noteModal"));
    const modalNoteTitle = document.getElementById("modalNoteTitle");
    const modalNoteContent = document.getElementById("modalNoteContent");
    const saveNoteBtn = document.getElementById("saveNoteBtn");
    
    let selectedNoteId = null;
    
    notesGrid.addEventListener("click", function (event) {
        // ✅ Ensure the clicked element is NOT an icon (action buttons)
        if (event.target.closest(".note-icons")) return;

        const noteElement = event.target.closest(".fundoo-dash-note");
        if (!noteElement) return;

        selectedNoteId = noteElement.dataset.id;
        const note = allNotes.find(n => n.id == selectedNoteId);

        // 🚨 Prevent editing if the note is in Trash
        if (currentView === "trash") {
            alert("❌ Notes in Trash cannot be edited! Restore them first.");
            selectedNoteId = null; // Reset the selected note
            return; // Stop execution here
        }

        // ✅ Ensure that editing is only allowed in "Notes" and "Archive"
        if (!note || (currentView !== "notes" && currentView !== "archive")) {
            selectedNoteId = null; // Reset selected note to prevent further actions
            return;
        }

        // ✅ Open modal only for editable notes
        modalNoteTitle.value = note.title;
        modalNoteContent.value = note.content;
        noteModal.show();
    });

    // ✅ Save edited note
    saveNoteBtn.addEventListener("click", async function () {
        if (!selectedNoteId) return;

        const updatedTitle = modalNoteTitle.value.trim();
        const updatedContent = modalNoteContent.value.trim();

        if (!updatedTitle || !updatedContent) {
            alert("Title and content cannot be empty!");
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/${selectedNoteId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify({ note: { title: updatedTitle, content: updatedContent } })
            });

            if (!response.ok) throw new Error("Failed to update note");

            // ✅ Update locally
            const noteIndex = allNotes.findIndex(note => note.id == selectedNoteId);
            if (noteIndex !== -1) {
                allNotes[noteIndex].title = updatedTitle;
                allNotes[noteIndex].content = updatedContent;
                localStorage.setItem("allNotes", JSON.stringify(allNotes));
                renderNotes();
            }

            noteModal.hide();
        } catch (error) {
            console.error("Error updating note:", error);
        }
    });

    
    let currentView = "notes";
    let allNotes = JSON.parse(localStorage.getItem("allNotes")) || [];
    
    if (!authToken) {
        alert("You are not logged in!");
        return;
    }
    
    document.getElementById("notesTab").addEventListener("click", () => switchView("notes"));
    document.getElementById("archiveTab").addEventListener("click", () => switchView("archive"));
    document.getElementById("trashTab").addEventListener("click", () => switchView("trash"));
    searchInput.addEventListener("input", renderNotes);
    
    renderNotes();
    fetchNotes();
    
    function switchView(view) {
        currentView = view;
        renderNotes();
        createNoteSection.style.display = view === "notes" ? "block" : "none";
        document.querySelectorAll(".fundoo-dash-sidebar li").forEach(tab => tab.classList.remove("active"));
        document.getElementById(`${view}Tab`).classList.add("active");
    }
    
    async function fetchNotes() {
        try {
            const response = await fetch(apiUrl, {
                method: "GET",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` }
            });
            const data = await response.json();
            if (!Array.isArray(data.notes)) throw new Error("Invalid API response");
            allNotes = data.notes;
            localStorage.setItem("allNotes", JSON.stringify(allNotes));
            renderNotes();
        } catch (error) {
            console.error("Error fetching notes:", error);
        }
    }
    
    function renderNotes() {
        notesGrid.innerHTML = "";
        const searchTerm = searchInput.value.toLowerCase();
        const filteredNotes = allNotes.filter(note =>
            (currentView === "notes" ? !note.is_deleted && !note.is_archived :
            currentView === "archive" ? note.is_archived && !note.is_deleted :
            currentView === "trash" ? note.is_deleted : false) &&
            (note.title.toLowerCase().includes(searchTerm) || note.content.toLowerCase().includes(searchTerm))
        );
        if (filteredNotes.length === 0) notesGrid.innerHTML = "<p>No notes found</p>";
        filteredNotes.forEach(addNoteToGrid);
    }
    
    noteInput.addEventListener("blur", async function () {
        const content = noteInput.value.trim();
        if (!content) return;
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
                body: JSON.stringify({ note: { title: content, content } })
            });
            const newNote = await response.json();
            allNotes.push(newNote);
            localStorage.setItem("allNotes", JSON.stringify(allNotes));
            noteInput.value = "";
            renderNotes();
        } catch (error) {
            console.error("Error creating note:", error);
        }
    });
    
    function addNoteToGrid(note) {
        const noteElement = document.createElement("div");
        noteElement.classList.add("fundoo-dash-note");
        noteElement.style.backgroundColor = note.color || "#fff";
        noteElement.dataset.id = note.id;
        noteElement.innerHTML = `
            <h4>${note.title}</h4>
            <p>${note.content}</p>
            <div class="note-icons">
                ${currentView === "notes" ? `
                    <i class="fas fa-palette color-icon" data-id="${note.id}" title="Change Color"></i>
                    <i class="fas fa-box-archive archive-icon" data-id="${note.id}" title="Archive"></i>
                    <i class="fas fa-trash delete-icon" data-id="${note.id}" title="Move to Trash"></i>
                ` : ""}
                ${currentView === "archive" ? `
                    <i class="fas fa-folder-open unarchive-icon" data-id="${note.id}" title="Unarchive"></i>
                    <i class="fas fa-trash delete-icon" data-id="${note.id}" title="Move to Trash"></i>
                ` : ""}
                ${currentView === "trash" ? `
                    <i class="fas fa-undo restore-icon" data-id="${note.id}" title="Restore"></i>
                    <i class="fas fa-trash-alt delete-permanent-icon" data-id="${note.id}" title="Delete Permanently"></i>
                ` : ""}
            </div>
        `;
        notesGrid.prepend(noteElement);
    }
    
    notesGrid.addEventListener("click", async function (event) {
        const target = event.target;
        const noteId = target.dataset.id;
        if (!noteId) return;
        if (target.classList.contains("archive-icon")) toggleArchive(noteId, true);
        else if (target.classList.contains("unarchive-icon")) toggleArchive(noteId, false);
        else if (target.classList.contains("delete-icon")) toggleTrash(noteId, true);
        else if (target.classList.contains("restore-icon")) toggleTrash(noteId, false);
        else if (target.classList.contains("delete-permanent-icon")) deleteNote(noteId);
        else if (target.classList.contains("color-icon")) changeColor(noteId);
    });

    async function toggleArchive(id, archive) {
        try {
            await fetch(`${apiUrl}/${id}/archive`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${authToken}` },
                body: JSON.stringify({ note: { is_archived: archive } })
            });

            updateNoteLocally(id, { is_archived: archive, was_archived_before_delete: archive });
        } catch (error) {
            console.error("❌ Error toggling archive:", error);
        }
    }

    async function toggleTrash(id, deleteStatus) {
        try {
            let note = allNotes.find(n => n.id == id);
            if (!note) {
                console.error("❌ Error: Note not found in local state.");
                return;
            }

            await fetch(`${apiUrl}/${id}/soft_delete`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${authToken}` },
                body: JSON.stringify({ note: { is_deleted: deleteStatus } })
            });

            updateNoteLocally(id, {
                is_deleted: deleteStatus,
                is_archived: deleteStatus ? false : note.was_archived_before_delete
            });
        } catch (error) {
            console.error("❌ Error moving note to trash:", error);
        }
    }
    
    

    async function deleteNote(id) {
        const noteIndex = allNotes.findIndex(note => note.id == id);
    
        if (noteIndex === -1 || !allNotes[noteIndex].is_deleted) {
            alert("❌ You can only delete notes from the Trash!");
            return;
        }
    
        if (!confirm("⚠️ Are you sure you want to delete this note permanently? This action cannot be undone.")) {
            return;
        }
    
        try {
            await fetch(`${apiUrl}/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${authToken}` }
            });
    
            // ✅ Remove the note from the `allNotes` array
            allNotes.splice(noteIndex, 1);
    
            // ✅ Update localStorage after deletion
            localStorage.setItem("allNotes", JSON.stringify(allNotes));
    
            // ✅ Re-render the Trash view correctly
            renderNotes();
        } catch (error) {
            console.error("❌ Error deleting note permanently:", error);
        }
    }
    
    async function changeColor(id) {
        const newColor = prompt("Enter new color (e.g., #ff5733):");
        if (!newColor) return;
        try {
            await fetch(`${apiUrl}/${id}/change_color`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${authToken}` },
                body: JSON.stringify({ note: { color: newColor } })
            });
            updateNoteLocally(id, { color: newColor });
        } catch (error) { console.error("Error changing color:", error); }
    }

    function updateNoteLocally(id, updatedData) {
        allNotes = allNotes.map(note => (note.id == id ? { ...note, ...updatedData } : note));
        localStorage.setItem("allNotes", JSON.stringify(allNotes)); // Save updated notes
        renderNotes();
    }
    const logoutButton = document.getElementById("Logout");
  if (logoutButton) {
      logoutButton.addEventListener("click", function () {
          localStorage.removeItem("jwtToken"); // Remove authentication token
          window.location.href = "fundooLogin.html"; // Redirect to login page
      });
  }
});
