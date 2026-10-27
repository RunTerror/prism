<!-- replay: How HTTPS keeps your password safe, as a diagram -->
HTTPS uses encryption to scramble your password before it travels to the server. Only your browser and the server have the keys to unscramble it, so no one eavesdropping on the internet can read it.

Here's how it works:

## The lock symbol
When you see 🔒 in your browser address bar, HTTPS is on. Your browser and the server have agreed on a secret key to encrypt everything you send.

## Your password gets scrambled
Before sending your login, HTTPS runs your password through an encryption algorithm using that shared key. It becomes unreadable gibberish like `7f3a9c2b...`. Even if someone intercepts the data, they just see gibberish.

## Only the right key unscrambles it
The server uses its matching key to turn the gibberish back into your real password. A hacker without that key can't decrypt it—it's like having a lock that only the bank's key opens.

```prism
<Flow nodes={[
  { title: "You type password", detail: "plaintext on your device" },
  { title: "HTTPS encrypts it", via: "using shared secret key", detail: "scrambled, unreadable" },
  { title: "Sent over internet", via: "as encrypted data", detail: "hackers see only gibberish" },
  { title: "Server decrypts", via: "using matching key", detail: "back to original password" }
]} />
```

**Bottom line:** HTTPS makes the journey safe. But choose strong passwords anyway—once you're logged in, the server stores them (hashed), not the web itself.

=====ANSWER=====

<!-- replay: Choose a laptop for 4K video editing under $1500 -->
For 4K video editing, you need a laptop with a strong processor (8+ cores), dedicated GPU (6GB+ VRAM), and plenty of RAM. Here are the top contenders under $1500:

```prism
<Compare
  items={[
    {
      name: "ASUS ROG Strix G16",
      processor: "Intel i7-14650HX",
      gpu: "RTX 5060 (8GB)",
      ram: "16GB DDR5",
      storage: "1TB SSD",
      display: "16\" 165Hz",
      price: "$1,399"
    },
    {
      name: "Acer Nitro V",
      processor: "Intel i7 (13th gen)",
      gpu: "RTX 4050 (6GB)",
      ram: "16GB DDR5",
      storage: "512GB SSD",
      display: "15.6\" 144Hz",
      price: "$1,099"
    },
    {
      name: "MacBook Air M5",
      processor: "Apple M5",
      gpu: "Integrated GPU",
      ram: "16GB Unified",
      storage: "512GB SSD",
      display: "15.3\" Liquid Retina",
      price: "$1,499"
    }
  ]}
  fields={["processor", "gpu", "ram", "storage", "display", "price"]}
/>
```

## My Pick: **ASUS ROG Strix G16**

It's the sweet spot for 4K editing. The RTX 5060 gives you real-time playback for 4K timelines and much faster rendering than the Acer, while the larger 16" screen and higher refresh rate make editing smoother. You get the latest hardware for the price.

**Runner-up:** If you want to save $300, the **Acer Nitro V** is solid—it handles 4K editing fine, just with a bit more patience during renders. **MacBook Air** is excellent if you prefer macOS and want best-in-class battery life, but the integrated GPU is slower for rendering than a dedicated card.

**What matters most:** All three have 16GB RAM (essential), fast SSDs (needed for 4K file playback), and processors strong enough. The GPU is the main difference—it's what makes renders 2–3× faster.

Sources:
- [12 Best Laptops for Video Editing Under $1500 (September 2026)](https://foliumbiosciences.com/best-laptops-for-video-editing-under-1500/)
- [12 Best Laptops for Video Editing Under 1500 (August 2026)](https://www.lynnbarsigianphotography.com/?p=12554)
- [Best Laptop for Video Editing Under $1500](https://gagadget.com/en/697891-laptop-for-video-editing/)

=====ANSWER=====

<!-- replay: Book a table for 4, with Allow or Cancel first -->
I'll book that table for you at Bella Napoli.

```prism
<Confirm 
  title="Book a table at Bella Napoli?"
  action="book_table"
  args={{ restaurant: "Bella Napoli", location: "Nashville", partySize: 4, date: "2026-10-31", time: "20:00" }}
  allow="Book table"
>
  <Field label="Restaurant" value="Bella Napoli" />
  <Field label="Date" value="Friday, October 31" />
  <Field label="Time" value="8:00 PM" />
  <Field label="Party size" value="4 people" />
  <Field label="Location" value="Nashville, TN" />
</Confirm>
```

Sources:
- [Bella Napoli on OpenTable](https://www.opentable.com.au/bella-napoli-nashville)
- [Bella Napoli Nashville](https://nashvillego.com/restaurants/bella-napoli)

=====ANSWER=====

<!-- replay: Spanish travel phrases quiz with a score -->
```prism
const [score, setScore] = useState(0)

const handleAnswer = (isCorrect) => {
  if (isCorrect) {
    setScore(score + 1)
  }
}

<Stack>
  <Card title="Spanish Travel Phrases Quiz">
    <Quiz 
      question="¿Dónde está la estación?" 
      options={["How much is it?", "Where is the train station?", "Do you speak English?"]} 
      answer={1}
      explain="This is essential for getting around in a Spanish-speaking country."
      onChange={handleAnswer}
    />
    <Quiz 
      question="¿Cuánto cuesta esto?" 
      options={["I'm lost", "How much does this cost?", "Can you help me?"]} 
      answer={1}
      explain="You'll use this constantly at markets, shops, and restaurants."
      onChange={handleAnswer}
    />
    <Quiz 
      question="Un café, por favor" 
      options={["A coffee, please", "One beer, thank you", "Where is the bathroom?"]} 
      answer={0}
      explain="Perfect for ordering at cafés—polite and practical."
      onChange={handleAnswer}
    />
    <Quiz 
      question="¿Hablas inglés?" 
      options={["Do you speak English?", "I need help", "Thank you very much"]} 
      answer={0}
      explain="Useful for finding English speakers when you need them."
      onChange={handleAnswer}
    />
    <Quiz 
      question="Necesito ayuda" 
      options={["I'm sorry", "I need help", "Excuse me, please"]} 
      answer={1}
      explain="Critical phrase for emergencies or when you're stuck."
      onChange={handleAnswer}
    />
    <Divider />
    <Stat label="Your score" value={score + " out of 5"} />
  </Card>
</Stack>
```

That's your quiz on 5 essential Spanish travel phrases! These cover asking for help, getting around, ordering, language barriers, and emergencies—the basics you'll need on the road.

**Pro tip:** Combine these with gestures and a smile—locals really appreciate when visitors try to speak Spanish, even if it's just these key phrases!

Sources:
- [Useful Spanish travel phrases every traveler should learn](https://www.linguaschools.com/blog/2016/03/21/useful-spanish-travel-phrases-words/)
- [91 Top Spanish Travel Phrases & Words for Travelers](https://tellmeinspanish.com/vocab/con-permiso)
- [Important Spanish Travel Phrases (with Downloadable PDF)](https://fluentu.com/blog/spanish/spanish-travel-phrases)
