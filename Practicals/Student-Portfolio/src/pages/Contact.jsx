import { useState } from 'react';

function Contact() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  return (
    <main className="page-content container">
      <section className="card">
        <h1>Contact</h1>
        <p className="section-intro">Send a quick message for collaboration or project discussions.</p>

        <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your name"
          />
          <span className="input-helper">Your name will only be used for this demo.</span>

          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            rows="5"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write your message here"
          />
          <div className="char-count">
            <span>Characters: {message.length}</span>
          </div>
        </form>

        <div className="typed-preview">
          <h2>Live Preview</h2>
          <p>{message || 'Start typing your message...'}</p>
        </div>

        <section className="help-section" aria-live="polite">
          <button
            type="button"
            className="btn"
            onClick={() => setShowHelp((previous) => !previous)}
          >
            {showHelp ? 'Hide Help' : 'Show Help'}
          </button>

          {showHelp && (
            <div className="help-box">
              <h3>Contact Instructions</h3>
              <p>Enter your name and message, then review your message in the live preview.</p>
              <p>Keep the message concise and include your preferred response timeline.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

export default Contact;
