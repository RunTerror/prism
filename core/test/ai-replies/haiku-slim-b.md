```prism
const [bill, setBill] = useState(50)
const [tipPercent, setTipPercent] = useState(15)
const [people, setPeople] = useState(2)

const tipAmount = bill * (tipPercent / 100)
const total = bill + tipAmount
const perPerson = total / people

<Card title="Tip Calculator">
  <Slider label="Bill amount ($)" value={bill} min={5} max={500} step={0.5} onChange={setBill} />
  <Slider label="Tip %" value={tipPercent} min={0} max={50} step={1} onChange={setTipPercent} />
  <Slider label="Split between" value={people} min={1} max={10} step={1} onChange={setPeople} />
  
  <Divider />
  
  <Field label="Tip amount" value={"$" + tipAmount.toFixed(2)} />
  <Field label="Total bill" value={"$" + total.toFixed(2)} />
  <Stat label="Per person" value={"$" + perPerson.toFixed(2)} />
</Card>
```

Drag the sliders to set the bill amount, tip percentage, and how many people are splitting it. The per-person amount updates as you change anything.

=====ANSWER=====

```prism
const [selected, setSelected] = useState("Basic")

<Compare
  items={[
    { name: "Basic", price: "$10/mo", data: "5 GB" },
    { name: "Plus", price: "$20/mo", data: "20 GB" },
    { name: "Max", price: "$35/mo", data: "Unlimited" }
  ]}
  fields={["price", "data"]}
  value={selected}
  onChange={setSelected}
/>
```

Tap a plan to pick it. **Basic** is best if you use data lightly. **Plus** gives you more room for streaming or browsing. **Max** is for heavy use—no worries about running over.

=====ANSWER=====

```prism
const [exercises, setExercises] = useState([])
const [input, setInput] = useState("")
const done = exercises.filter(e => e.done).length

function addExercise() {
  if (input.trim()) {
    setExercises([...exercises, { id: Date.now(), name: input, done: false }])
    setInput("")
  }
}

function toggleExercise(id) {
  setExercises(exercises.map(e => e.id === id ? { ...e, done: !e.done } : e))
}

function clearDone() {
  setExercises(exercises.filter(e => !e.done))
}

<Card title="Workout Tracker">
  {exercises.length > 0 && <Progress value={done / exercises.length} label={`${done}/${exercises.length} done`} />}
  <Input value={input} onChange={setInput} placeholder="e.g. Push-ups, squats" />
  <Button main onPress={addExercise} disabled={!input.trim()}>Add exercise</Button>
  {exercises.length > 0 && (
    <>
      <Divider />
      <Stack>
        {exercises.map(e => (
          <Switch key={e.id} label={e.name} value={e.done} onChange={() => toggleExercise(e.id)} />
        ))}
      </Stack>
      {done > 0 && <Button onPress={clearDone}>Clear completed</Button>}
    </>
  )}
  {exercises.length === 0 && <Text secondary>Add an exercise to get started!</Text>}
</Card>
```

Done! Type in an exercise name (like "Push-ups"), tap Add, then toggle the switch to check it off as you complete it. The progress bar shows how many you've finished, and you can clear completed exercises when you're done.

=====ANSWER=====

You're spending ₹1,950 a month, leaving ₹550 (22% of income) unallocated—a healthy buffer for savings or emergencies.

```prism
const income = 2500
const categories = [
  { name: "Rent", amount: 1200 },
  { name: "Food", amount: 400 },
  { name: "Transport", amount: 150 },
  { name: "Fun", amount: 200 }
]
const spent = categories.reduce((sum, cat) => sum + cat.amount, 0)
const remaining = income - spent

<Card title="Monthly Budget" subtitle={`₹${income.toLocaleString()} income`}>
  <Chart kind="bar" data={categories.map(c => c.amount).concat([remaining])} labels={categories.map(c => c.name).concat(["Left"])} />
  <Divider />
  {categories.map(cat => (
    <Field key={cat.name} label={cat.name} value={`₹${cat.amount} (${Math.round(cat.amount / income * 100)}%)`} />
  ))}
  <Field label="Remaining" value={`₹${remaining} (${Math.round(remaining / income * 100)}%)`} />
</Card>
```

=====ANSWER=====

```prism
const [volume, setVolume] = useState(70)
const [quietHours, setQuietHours] = useState(false)

<Card title="Notification Settings">
  <Slider label="Volume" value={volume} min={0} max={100} step={5} onChange={setVolume} />
  <Text secondary>{volume}%</Text>
  <Divider />
  <Switch label="Quiet hours" value={quietHours} onChange={setQuietHours} />
  <Text secondary>Mute notifications between 10 PM and 8 AM</Text>
  <Divider />
  <Button main onPress={() => P.toast("Settings saved")}>Save Changes</Button>
</Card>
```

A simple settings screen with volume control (0–100%) and a toggle for quiet hours. The volume slider gives immediate feedback, and tapping Save confirms the changes.

=====ANSWER=====

Type in either field to convert. They update each other automatically.

```prism
const [km, setKm] = useState(10)
const miles = km * 0.621371

<Card title="km ↔ miles">
  <Input 
    label="Kilometres" 
    kind="number" 
    value={km} 
    onChange={v => setKm(v ?? 0)} 
  />
  <Input 
    label="Miles" 
    kind="number" 
    value={Math.round(miles * 100) / 100} 
    onChange={v => setKm((v ?? 0) / 0.621371)} 
  />
</Card>
```

=====ANSWER=====

Here's a BMI calculator. Slide the height and weight to see your category.

```prism
const [height, setHeight] = useState(170)
const [weight, setWeight] = useState(70)

const bmi = weight / ((height / 100) ** 2)
let category = ""
let status = ""

if (bmi < 18.5) {
  category = "Underweight"
  status = "warning"
} else if (bmi < 25) {
  category = "Normal weight"
  status = "good"
} else if (bmi < 30) {
  category = "Overweight"
  status = "warning"
} else {
  category = "Obese"
  status = "bad"
}

<Card title="BMI Calculator">
  <Slider label="Height (cm)" value={height} min={100} max={250} onChange={setHeight} />
  <Slider label="Weight (kg)" value={weight} min={30} max={200} onChange={setWeight} />
  <Divider />
  <Stat label="BMI" value={bmi.toFixed(1)} />
  <Badge status={status}>{category}</Badge>
</Card>
```

=====ANSWER=====

```prism
const [items, setItems] = useState([])
const [name, setName] = useState("")
const [qty, setQty] = useState(1)

const addItem = () => {
  if (name.trim()) {
    setItems([...items, { id: Date.now(), name, quantity: qty, bought: false }])
    setName("")
    setQty(1)
  }
}

const toggleBought = (id) => {
  setItems(items.map(item => item.id === id ? { ...item, bought: !item.bought } : item))
}

const clearCompleted = () => {
  setItems(items.filter(item => !item.bought))
}

const toBuy = items.filter(item => !item.bought)
const boughtItems = items.filter(item => item.bought)
const totalQty = toBuy.reduce((sum, item) => sum + item.quantity, 0)

<Stack>
  <Card title="Add item">
    <Input label="Item name" value={name} onChange={setName} placeholder="Milk, bread, etc." />
    <Slider label="Quantity" value={qty} min={1} max={10} onChange={setQty} />
    <Button main onPress={addItem}>Add to list</Button>
  </Card>
  
  {items.length === 0 && (
    <Card>
      <Text secondary>Your shopping list is empty. Add items to get started.</Text>
    </Card>
  )}
  
  {toBuy.length > 0 && (
    <Card title={`To buy (${totalQty} items)`}>
      {toBuy.map(item => (
        <Switch key={item.id} label={`${item.name} ×${item.quantity}`} value={false} onChange={() => toggleBought(item.id)} />
      ))}
    </Card>
  )}
  
  {toBuy.length === 0 && items.length > 0 && (
    <Card title="To buy">
      <Text secondary>All done! 🎉</Text>
    </Card>
  )}
  
  {boughtItems.length > 0 && (
    <Card title={`Bought (${boughtItems.length})`}>
      {boughtItems.map(item => (
        <Switch key={item.id} label={`${item.name} ×${item.quantity}`} value={true} onChange={() => toggleBought(item.id)} />
      ))}
      <Divider />
      <Button onPress={clearCompleted}>Clear completed</Button>
    </Card>
  )}
</Stack>
```

**How to use it:**
1. **Add items** at the top with a name and quantity
2. **Toggle the switch** as you buy items—they move to the "Bought" section
3. **See how many are left** in the "To buy" title
4. **Clear completed** removes all bought items at once, or toggle back any item if you need it

=====ANSWER=====

Here's a 3-question solar system quiz. Answer all three, and your score appears at the end.

```prism
const [answers, setAnswers] = useState({})
const questions = [
  {
    id: 1,
    question: "Which planet is closest to the Sun?",
    options: ["Venus", "Mercury", "Earth"],
    correct: 1
  },
  {
    id: 2,
    question: "How many moons does Mars have?",
    options: ["0", "1", "2"],
    correct: 2
  },
  {
    id: 3,
    question: "What is the largest planet in our solar system?",
    options: ["Saturn", "Jupiter", "Neptune"],
    correct: 1
  }
]

const score = Object.keys(answers).reduce((sum, id) => {
  return sum + (answers[id] === questions.find(q => q.id === parseInt(id)).correct ? 1 : 0)
}, 0)

const allAnswered = Object.keys(answers).length === 3

<Stack>
  {questions.map(q => (
    <Card key={q.id} title={`Question ${q.id}`}>
      <Quiz 
        question={q.question}
        options={q.options}
        answer={q.correct}
        explain="✓"
      />
    </Card>
  ))}
  
  {allAnswered && (
    <>
      <Divider />
      <Card title="Your score">
        <Stat label="Correct" value={`${score} out of 3`} />
        <Text secondary>{score === 3 ? "Perfect! 🌟" : score === 2 ? "Great job! 🚀" : "Good try! 🌙"}</Text>
      </Card>
    </>
  )}
</Stack>
```

=====ANSWER=====

```prism
const [servings, setServings] = useState(2)

const ingredients = [
  { name: "All-purpose flour", amount: 1, unit: "cup" },
  { name: "Sugar", amount: 2, unit: "tbsp" },
  { name: "Baking powder", amount: 2, unit: "tsp" },
  { name: "Salt", amount: 0.5, unit: "tsp" },
  { name: "Milk", amount: 1, unit: "cup" },
  { name: "Egg", amount: 1, unit: "" },
  { name: "Melted butter", amount: 2, unit: "tbsp" },
]

const scaled = ingredients.map(ing => ({
  ...ing,
  amount: (ing.amount * servings / 2).toFixed(2).replace(/\.?0+$/, '')
}))

<Card title="Fluffy Pancakes" subtitle={servings === 1 ? "1 serving" : `${servings} servings`}>
  <Slider label="Servings" value={servings} min={1} max={8} onChange={setServings} />
  <Divider />
  <Stack>
    {scaled.map((ing, i) => (
      <Field key={i} label={ing.name} value={ing.amount + (ing.unit ? " " + ing.unit : "")} />
    ))}
  </Stack>
  <Divider />
  <Text secondary>1. Mix flour, sugar, baking powder and salt. 2. Whisk milk, egg, and butter together. 3. Combine wet and dry, stir until just mixed. 4. Cook on a hot griddle until bubbles form, flip and cook until golden.</Text>
</Card>
```

Adjust the slider to scale all the ingredients up or down. The recipe works for 1 to 8 servings, and each serving makes about 2–3 pancakes.

=====ANSWER=====

```prism
const total = 90
const chrisSalad = 12
const remaining = total - chrisSalad
const anaShare = remaining / 2
const benShare = remaining / 2

<Card title="Bill Split">
  <Field label="Total bill" value={"$" + total} />
  <Field label="Chris's salad" value={"$" + chrisSalad} />
  <Divider />
  <Field label="Ana pays" value={"$" + anaShare} />
  <Field label="Ben pays" value={"$" + benShare} />
  <Field label="Chris pays" value={"$" + chrisSalad} />
  <Divider />
  <Field label="Check" value={"$" + (anaShare + benShare + chrisSalad)} />
</Card>
```

**Ana and Ben each pay $39. Chris pays $12 for his salad.**

=====ANSWER=====

```prism
const [habits, setHabits] = useState([
  { id: 1, name: "Exercise", days: [false, false, true, false, false, false, false] },
  { id: 2, name: "Read", days: [true, true, false, true, false, false, false] },
  { id: 3, name: "Drink Water", days: [true, true, true, true, true, false, false] }
])

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const toggleDay = (habitId, dayIndex) => {
  setHabits(habits.map(h =>
    h.id === habitId
      ? { ...h, days: h.days.map((d, i) => i === dayIndex ? !d : d) }
      : h
  ))
}

const count = (days) => days.filter(d => d).length

<Stack>
  {habits.map(habit => (
    <Card key={habit.id} title={habit.name} subtitle={`${count(habit.days)}/7 done`}>
      <Row wrap>
        {habit.days.map((done, i) => (
          <Button key={i} onPress={() => toggleDay(habit.id, i)}>
            {dayLabels[i]} {done ? "✓" : "○"}
          </Button>
        ))}
      </Row>
    </Card>
  ))}
</Stack>
```

Tap any day to check it off. The tracker shows your progress for each habit this week (Mon 10/19 – Sun 10/25).

=====ANSWER=====

```prism
const hours = [
  { time: "Now", temp: 18, condition: "Cloudy" },
  { time: "13:00", temp: 18, condition: "Cloudy" },
  { time: "14:00", temp: 19, condition: "Partly cloudy" },
  { time: "15:00", temp: 19, condition: "Partly cloudy" }
]

<Stack>
  <Card title="London" subtitle="Today">
    <Stat label="Temperature" value="18°C" />
    <Field label="Conditions" value="Cloudy" />
    <Field label="Humidity" value="60%" />
    <Field label="Wind" value="12 km/h" />
  </Card>
  
  <Card title="Next 3 hours">
    {hours.map((h, i) => (
      <Row key={i} wrap>
        <Text strong>{h.time}</Text>
        <Text secondary>{h.temp}° · {h.condition}</Text>
      </Row>
    ))}
  </Card>
</Stack>
```

London is cloudy and cool at 18°C with light wind. It should stay much the same over the next few hours, warming slightly to 19°C by early afternoon.

=====ANSWER=====

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")

const passwordStrength = password.length === 0 ? null : 
  password.length < 8 ? "weak" :
  password.length < 12 ? "fair" :
  /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password) ? "strong" : "fair"

const isFilled = name.trim() && email.trim() && password.length > 0

<Card title="Sign up">
  <Input label="Name" value={name} onChange={setName} placeholder="Ada Lovelace" />
  <Input label="Email" value={email} onChange={setEmail} kind="email" placeholder="ada@example.com" />
  <Input label="Password" value={password} onChange={setPassword} placeholder="Enter a strong password" />
  {password.length > 0 && (
    <Text secondary status={passwordStrength === "strong" ? "good" : passwordStrength === "fair" ? "warning" : "bad"}>
      {passwordStrength === "weak" ? "🔓 Too short (use 8+ characters)" : 
       passwordStrength === "fair" ? "🔐 Fair (add uppercase, numbers, symbols)" : 
       "✓ Strong"}
    </Text>
  )}
  <Button main disabled={!isFilled} onPress={() => P.toast("Signed up!")}>Sign up</Button>
</Card>
```

The submit button only works when all three fields have text. As you type the password, you get a hint about its strength.

=====ANSWER=====

Here's a 5-minute countdown timer with start and reset buttons:

```prism
const [seconds, setSeconds] = useState(300)
const [isActive, setIsActive] = useState(false)

const minutes = Math.floor(seconds / 60)
const secs = seconds % 60
const timeDisplay = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

const handleTick = () => {
  if (seconds > 0) setSeconds(seconds - 1)
  if (seconds === 1) setIsActive(false)
}

// Simulate one second passing for demo
const handleStart = () => setIsActive(!isActive)
const handleReset = () => { setSeconds(300); setIsActive(false) }

<Card title="5 Minute Timer">
  <Stat label="Time remaining" value={timeDisplay} />
  <Text secondary>
    {isActive ? "Timer running..." : "Ready to start"}
  </Text>
  <Row>
    <Button main onPress={handleStart}>
      {isActive ? "Pause" : "Start"}
    </Button>
    <Button onPress={handleReset}>Reset</Button>
  </Row>
  {seconds === 0 && <Callout status="good" title="Time's up!">Your 5 minutes are done.</Callout>}
</Card>
```

**Note:** This is a visual timer interface. For a real countdown that updates every second, you'd need a background process or a full app with React hooks—the chat screen system here keeps things simple with just state and interaction. Tap **Start** to begin, **Pause** to stop, and **Reset** to go back to 5 minutes.

=====ANSWER=====

```prism
<Chart 
  kind="bar" 
  data={[4200, 8100, 6500, 10200, 7300, 3900, 9000]} 
  labels={["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"]}
  label="Steps per day"
  height="md"
/>
```

Your best day was Sunday with 10,200 steps. Your average over the week was 7,043 steps.

=====ANSWER=====

Choose a destination, pick your dates, then confirm your trip. Step through each decision and review before booking.

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [startDate, setStartDate] = useState("")
const [endDate, setEndDate] = useState("")

const canProceed = () => {
  if (step === 1) return destination.length > 0
  if (step === 2) return startDate.length > 0 && endDate.length > 0
  return true
}

<Card 
  title={`Step ${step} of 3`} 
  subtitle={step === 1 ? "Destination" : step === 2 ? "Dates" : "Confirm"}
>
  {step === 1 && (
    <Select 
      label="Where to?" 
      value={destination} 
      options={["Paris", "Tokyo", "New York", "Barcelona", "Dubai", "Sydney"]}
      onChange={setDestination}
      placeholder="Choose a city"
    />
  )}
  
  {step === 2 && (
    <Stack>
      <Input 
        label="Start date" 
        value={startDate} 
        placeholder="Dec 15"
        onChange={setStartDate}
      />
      <Input 
        label="End date" 
        value={endDate} 
        placeholder="Dec 22"
        onChange={setEndDate}
      />
    </Stack>
  )}
  
  {step === 3 && (
    <Stack>
      <Field label="Destination" value={destination} />
      <Field label="Depart" value={startDate} />
      <Field label="Return" value={endDate} />
    </Stack>
  )}
  
  <Divider />
  
  <Row>
    {step > 1 && <Button onPress={() => setStep(step - 1)}>Back</Button>}
    {step < 3 && <Button main disabled={!canProceed()} onPress={() => setStep(step + 1)}>Next</Button>}
    {step === 3 && <Button main onPress={() => P.toast("✓ Trip booked to " + destination)}>Confirm</Button>}
  </Row>
</Card>
```

=====ANSWER=====

```prism
const [voted, setVoted] = useState(null)
const options = [
  { id: 1, name: "Dark mode", votes: 284 },
  { id: 2, name: "Offline support", votes: 156 },
  { id: 3, name: "Team collaboration", votes: 412 },
  { id: 4, name: "Advanced analytics", votes: 198 }
]
const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0)
const handleVote = (id) => {
  setVoted(id)
  options.find(opt => opt.id === id).votes += 1
}

<Card title="Which feature should we build next?">
  <Stack tight>
    {options.map(opt => (
      <Stack key={opt.id} tight>
        {voted === null ? (
          <Button onPress={() => handleVote(opt.id)}>{opt.name}</Button>
        ) : (
          <>
            <Row wrap>
              <Text>{opt.name}</Text>
              <Text secondary>{opt.votes} votes</Text>
            </Row>
            <Progress value={opt.votes / (totalVotes + 1)} />
          </>
        )}
      </Stack>
    ))}
  </Stack>
  {voted && (
    <>
      <Divider />
      <Text secondary>Total votes: {totalVotes + 1}</Text>
      <Button onPress={() => setVoted(null)}>Vote again</Button>
    </>
  )}
</Card>
```

The poll shows 4 features. Tap one to vote — it then displays the results with vote counts and progress bars. You can vote again if you change your mind.
