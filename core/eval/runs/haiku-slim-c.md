Request 1

```prism
const [bill, setBill] = useState(100)
const [people, setPeople] = useState(2)
const [tipPercent, setTipPercent] = useState(18)

const tip = bill * tipPercent / 100
const total = bill + tip
const perPerson = total / people

<Card title="Tip Calculator">
  <Slider label="Bill amount ($)" value={bill} min={5} max={500} step={5} onChange={setBill} />
  <Slider label="Number of people" value={people} min={1} max={20} step={1} onChange={setPeople} />
  <Slider label="Tip percentage (%)" value={tipPercent} min={0} max={30} step={1} onChange={setTipPercent} />
  
  <Divider />
  
  <Field label="Subtotal" value={"$" + bill.toFixed(2)} />
  <Field label="Tip" value={"$" + tip.toFixed(2)} />
  <Field label="Total" value={"$" + total.toFixed(2)} />
  
  <Divider />
  
  <Stat label="Per person" value={"$" + perPerson.toFixed(2)} />
</Card>
```

Adjust the bill, number of diners, and tip percentage with the sliders, and it shows the total tip, bill with tip, and what each person owes.

=====ANSWER=====

Request 2

```prism
const [chosen, setChosen] = useState("")

<Compare 
  items={[
    { name: "Basic", price: "$10/month", data: "5 GB" },
    { name: "Plus", price: "$20/month", data: "20 GB" },
    { name: "Max", price: "$35/month", data: "Unlimited" }
  ]}
  fields={["price", "data"]}
  value={chosen}
  onChange={setChosen}
/>
```

Tap any plan to pick it. Which one fits your needs best?

=====ANSWER=====

Request 3

Here's a simple workout tracker for you. Add exercises, tick them off as you complete them, and watch your progress.

```prism
const [exercises, setExercises] = useState([
  { id: 1, name: "Push-ups", done: false },
  { id: 2, name: "Squats", done: true }
])
const [newExercise, setNewExercise] = useState("")

const addExercise = () => {
  if (newExercise.trim()) {
    setExercises([...exercises, { id: Date.now(), name: newExercise, done: false }])
    setNewExercise("")
  }
}

const toggleExercise = (id) => {
  setExercises(exercises.map(ex => ex.id === id ? { ...ex, done: !ex.done } : ex))
}

const completed = exercises.filter(ex => ex.done).length

<Card title="Today's Workout" subtitle={`${completed}/${exercises.length} completed`}>
  {exercises.map(ex => (
    <Switch key={ex.id} label={ex.name} value={ex.done} onChange={() => toggleExercise(ex.id)} />
  ))}
  <Divider />
  <Input value={newExercise} onChange={setNewExercise} placeholder="Add exercise" onSubmit={addExercise} />
  <Button main onPress={addExercise}>Add</Button>
</Card>
```

=====ANSWER=====

Request 4

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
const spentPercent = spent / income

<Card title="Monthly Budget">
  {categories.map(cat => (
    <Field key={cat.name} label={cat.name} value={"$" + cat.amount} />
  ))}
  <Divider />
  <Stat label="Total spent" value={"$" + spent} />
  <Stat label="Remaining" value={"$" + remaining} status={remaining > 0 ? "good" : "bad"} />
  <Progress value={spentPercent} label={"$" + income + " income"} />
</Card>
```

You've spent **$1,950 out of $2,500** (78%). You have **$550 left** for the month — a comfortable cushion.

=====ANSWER=====

Request 5

```prism
const [volume, setVolume] = useState(70)
const [quietHours, setQuietHours] = useState(false)

<Stack>
  <Card title="Notification Settings">
    <Slider 
      label="Volume" 
      value={volume} 
      min={0} 
      max={100} 
      onChange={setVolume} 
    />
    <Field label="Level" value={volume + "%"} />
    <Divider />
    <Switch 
      label="Quiet hours" 
      value={quietHours} 
      onChange={setQuietHours} 
    />
    <Text secondary>
      {quietHours ? "No notifications between 10 PM and 8 AM" : "Notifications on at all times"}
    </Text>
  </Card>
</Stack>
```

=====ANSWER=====

Request 6

```prism
const [km, setKm] = useState(10)
const miles = km * 0.621371
const handleMilesChange = (m) => setKm(m / 0.621371)

<Card title="Distance converter">
  <Input 
    label="Kilometres" 
    kind="number" 
    value={km || ""} 
    onChange={v => setKm(v ?? 0)} 
    placeholder="0"
  />
  <Input 
    label="Miles" 
    kind="number" 
    value={Math.round(miles * 100) / 100 || ""} 
    onChange={v => handleMilesChange(v ?? 0)} 
    placeholder="0"
  />
</Card>
```

Type a distance in either field and it updates the other instantly. 1 km = 0.621 miles.

=====ANSWER=====

Request 7

```prism
const [height, setHeight] = useState(170)
const [weight, setWeight] = useState(70)

const heightM = height / 100
const bmi = weight / (heightM * heightM)

function getCategory(bmi) {
  if (bmi < 18.5) return "Underweight"
  if (bmi < 25) return "Normal weight"
  if (bmi < 30) return "Overweight"
  return "Obese"
}

function getStatus(bmi) {
  if (bmi < 18.5) return "warning"
  if (bmi < 25) return "good"
  if (bmi < 30) return "warning"
  return "bad"
}

const category = getCategory(bmi)
const status = getStatus(bmi)

<Card title="BMI Calculator">
  <Slider label="Height (cm)" value={height} min={100} max={220} step={1} onChange={setHeight} />
  <Slider label="Weight (kg)" value={weight} min={30} max={150} step={1} onChange={setWeight} />
  <Stat label="BMI" value={bmi.toFixed(1)} />
  <Badge status={status}>{category}</Badge>
</Card>
```

Drag the sliders to adjust your height and weight. Your BMI and category update instantly. Categories: under 18.5 is underweight, 18.5–25 is healthy, 25–30 is overweight, and 30+ is obese.

=====ANSWER=====

Request 8

```prism
const [items, setItems] = useState([])
const [name, setName] = useState("")
const [qty, setQty] = useState(1)

const remaining = items.filter(item => !item.done).length

const addItem = () => {
  if (name.trim()) {
    setItems([...items, { id: Date.now(), name, qty, done: false }])
    setName("")
    setQty(1)
  }
}

const toggleItem = (id) => {
  setItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item))
}

const removeItem = (id) => {
  setItems(items.filter(item => item.id !== id))
}

<Stack>
  <Card title="Shopping List" subtitle={remaining + " item" + (remaining !== 1 ? "s" : "") + " left"}>
    <Input 
      label="Add item" 
      value={name} 
      onChange={setName}
      placeholder="Milk, bread, eggs..."
      onSubmit={addItem}
    />
    <Row tight>
      <Slider label="Qty" value={qty} min={1} max={20} onChange={setQty} />
      <Button main onPress={addItem} label="Add" disabled={!name.trim()}>Add</Button>
    </Row>
  </Card>

  {items.length > 0 && (
    <Card>
      {items.map(item => (
        <Row key={item.id} tight>
          <Switch value={item.done} onChange={() => toggleItem(item.id)} />
          <Stack tight style={{flex: 1}}>
            <Text strike={item.done}>{item.name}</Text>
            <Text secondary>×{item.qty}</Text>
          </Stack>
          <Button danger onPress={() => removeItem(item.id)} label="Remove">✕</Button>
        </Row>
      ))}
    </Card>
  )}

  {items.length === 0 && <Text secondary>No items yet. Add one to get started.</Text>}
</Stack>
```

Tap the switch to mark items as bought, and they count down from "left". Add a quantity so you don't forget how many you need.

=====ANSWER=====

Request 9

Here's an interactive solar system quiz for you:

```prism
const [answers, setAnswers] = useState([null, null, null])
const [showScore, setShowScore] = useState(false)

const questions = [
  {
    question: "Which planet is closest to the Sun?",
    options: ["Venus", "Mercury", "Earth", "Mars"],
    correct: 1
  },
  {
    question: "How many moons does Mars have?",
    options: ["0", "1", "2", "4"],
    correct: 2
  },
  {
    question: "What is the largest planet in our solar system?",
    options: ["Saturn", "Neptune", "Jupiter", "Uranus"],
    correct: 2
  }
]

const score = answers.filter((a, i) => a === questions[i].correct).length
const answered = answers.filter(a => a !== null).length

function selectAnswer(questionIndex, optionIndex) {
  const newAnswers = [...answers]
  newAnswers[questionIndex] = optionIndex
  setAnswers(newAnswers)
}

function reset() {
  setAnswers([null, null, null])
  setShowScore(false)
}

<Stack>
  {!showScore ? (
    <>
      {questions.map((q, i) => (
        <Card key={i} title={`Question ${i + 1}`}>
          <Text>{q.question}</Text>
          <Stack tight>
            {q.options.map((opt, j) => (
              <Button
                key={j}
                onPress={() => selectAnswer(i, j)}
              >
                {answers[i] === j ? "✓ " : ""}{opt}
              </Button>
            ))}
          </Stack>
        </Card>
      ))}
      <Button main disabled={answered < 3} onPress={() => setShowScore(true)}>
        {answered < 3 ? `Answer all questions (${answered}/3)` : "See my score"}
      </Button>
    </>
  ) : (
    <Card title="Your score">
      <Stat label="Correct answers" value={`${score} out of 3`} status={score === 3 ? "good" : score >= 2 ? "warning" : "bad"} />
      <Divider />
      <Stack tight>
        {questions.map((q, i) => (
          <Stack key={i} tight>
            <Text strong>{q.question}</Text>
            <Text>{q.options[answers[i]]}</Text>
            <Badge status={answers[i] === q.correct ? "good" : "bad"}>
              {answers[i] === q.correct ? "Correct" : `Should be: ${q.options[q.correct]}`}
            </Badge>
          </Stack>
        ))}
      </Stack>
      <Button main onPress={reset}>Try again</Button>
    </Card>
  )}
</Stack>
```

Pick your answers to all three questions, then tap "See my score" to find out how you did. You can retake it anytime!

=====ANSWER=====

Request 10

```prism
const [servings, setServings] = useState(4)

const baseRecipe = {
  flour: 2,
  sugar: 2,
  bakingPowder: 2,
  salt: 0.5,
  milk: 2,
  eggs: 2,
  butter: 2
}

const scale = servings / 4
const scaled = Object.fromEntries(
  Object.entries(baseRecipe).map(([key, value]) => [key, (value * scale).toFixed(2)])
)

<Card title="Pancake Recipe">
  <Slider label="Servings" value={servings} min={1} max={8} onChange={setServings} />
  
  <Title>Ingredients</Title>
  <Field label="Flour" value={scaled.flour + " cups"} />
  <Field label="Sugar" value={scaled.sugar + " tbsp"} />
  <Field label="Baking powder" value={scaled.bakingPowder + " tsp"} />
  <Field label="Salt" value={scaled.salt + " tsp"} />
  <Field label="Milk" value={scaled.milk + " cups"} />
  <Field label="Eggs" value={scaled.eggs + " large"} />
  <Field label="Melted butter" value={scaled.butter + " tbsp"} />
  
  <Divider />
  
  <Stack tight>
    <Text strong>Instructions</Text>
    <Text secondary>1. Mix dry ingredients</Text>
    <Text secondary>2. Whisk milk, eggs, and butter</Text>
    <Text secondary>3. Combine wet and dry until just blended</Text>
    <Text secondary>4. Cook on buttered griddle until golden</Text>
  </Stack>
</Card>
```

Adjust the slider to scale the ingredients for however many servings you need. The base recipe makes 4 servings.

=====ANSWER=====

Request 11

```prism
const [total, setTotal] = useState(90)
const [chrisSalad, setChrisSalad] = useState(12)

const remaining = total - chrisSalad
const perPerson = remaining / 2

<Card title="Bill split">
  <Field label="Total bill" value={"$" + total.toFixed(2)} />
  <Field label="Chris's salad" value={"$" + chrisSalad.toFixed(2)} />
  <Divider />
  <Field label="Ana pays" value={"$" + perPerson.toFixed(2)} status="good" />
  <Field label="Ben pays" value={"$" + perPerson.toFixed(2)} status="good" />
  <Field label="Chris pays" value={"$" + chrisSalad.toFixed(2)} />
</Card>
```

**Ana and Ben each pay $39. Chris pays $12 for his salad.**

The remaining $78 (after Chris's $12 salad) splits evenly between Ana and Ben.

=====ANSWER=====

Request 12

```prism
const [completions, setCompletions] = useState([
  [false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false],
  [false, false, false, false, false, false, false]
])

const habits = ["Exercise", "Read", "Meditate"]
const days = ["M", "T", "W", "T", "F", "S", "S"]

function toggle(h, d) {
  const updated = completions.map(row => [...row])
  updated[h][d] = !updated[h][d]
  setCompletions(updated)
}

const counts = completions.map(h => h.filter(Boolean).length)

<Card title="This Week's Habits" subtitle="Oct 19–25">
  <Stack>
    {habits.map((habit, hIdx) => (
      <Stack key={hIdx} tight>
        <Row>
          <Text strong>{habit}</Text>
          <Text secondary>{counts[hIdx]}/7 days</Text>
        </Row>
        <Row wrap>
          {days.map((day, dIdx) => (
            <Button key={dIdx} onPress={() => toggle(hIdx, dIdx)}>
              {completions[hIdx][dIdx] ? "✓" : day}
            </Button>
          ))}
        </Row>
      </Stack>
    ))}
  </Stack>
</Card>
```

Tap any day button to mark it complete (shows ✓), or tap again to uncheck. The count on each habit updates as you go.

=====ANSWER=====

Request 13

```prism
const current = { temp: 18, condition: "Cloudy", humidity: 60, wind: 12 };
const forecast = [
  { hour: "Now", temp: 18, condition: "Cloudy" },
  { hour: "13:00", temp: 17, condition: "Cloudy" },
  { hour: "14:00", temp: 18, condition: "Mostly cloudy" },
  { hour: "15:00", temp: 19, condition: "Partly cloudy" }
];

<Stack>
  <Card title="London today">
    <Stack tight>
      <Text strong>{current.temp}°C · {current.condition}</Text>
      <Text secondary>High: 20°C · Low: 15°C</Text>
    </Stack>
    <Divider />
    <Row wrap>
      <Field label="Humidity" value={current.humidity + "%"} />
      <Field label="Wind" value={current.wind + " km/h"} />
    </Row>
  </Card>
  
  <Card title="Next 3 hours">
    {forecast.map((slot, i) => (
      <Row key={i}>
        <Text strong>{slot.hour}</Text>
        <Text>{slot.temp}°C</Text>
        <Text secondary>{slot.condition}</Text>
      </Row>
    ))}
  </Card>
</Stack>
```

Current conditions in London: **18°C and cloudy** with 60% humidity and a light wind at 12 km/h. Over the next 3 hours, expect the temperature to dip slightly to 17°C around 1 PM, then gradually warm back up to 19°C by 3 PM, with conditions staying mostly cloudy.

=====ANSWER=====

Request 14

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")

const getStrength = (pwd) => {
  if (pwd.length < 6) return { text: "Too weak", status: "bad" }
  if (pwd.length < 10) return { text: "Fair", status: "warning" }
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { text: "Strong", status: "good" }
  return { text: "Fair", status: "warning" }
}

const strength = getStrength(password)
const isFilled = name.trim() && email.trim() && password.length > 0

<Card title="Sign up">
  <Input label="Name" value={name} onChange={setName} placeholder="Your name" />
  <Input label="Email" kind="email" value={email} onChange={setEmail} placeholder="you@example.com" />
  <Stack tight>
    <Input label="Password" kind="text" value={password} onChange={setPassword} placeholder="At least 6 characters" />
    {password && <Text secondary status={strength.status}>{strength.text}</Text>}
  </Stack>
  <Button main disabled={!isFilled} onPress={() => P.ask("Sign me up with these details")}>
    Create account
  </Button>
</Card>
```

The submit button stays greyed out until you fill in all three fields. The password hint changes as you type, showing how strong it is.

=====ANSWER=====

Request 15

Here's a 5-minute countdown timer with start and reset controls.

```prism
const [secondsLeft, setSecondsLeft] = useState(300)
const [isRunning, setIsRunning] = useState(false)

const minutes = Math.floor(secondsLeft / 60)
const seconds = secondsLeft % 60
const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

<Card title="Countdown Timer">
  <Stack tight>
    <Text strong lines={1} style={{ fontSize: 48, textAlign: 'center' }}>
      {timeDisplay}
    </Text>
    <Row wrap>
      <Button main onPress={() => setIsRunning(!isRunning)} disabled={secondsLeft === 0}>
        {isRunning ? 'Pause' : 'Start'}
      </Button>
      <Button onPress={() => { setSecondsLeft(300); setIsRunning(false); }}>
        Reset
      </Button>
    </Row>
  </Stack>
</Card>
```

**Note:** This shows the timer interface and lets you tap Start/Pause and Reset. For a real countdown that ticks automatically, you'd need a timer running in the background—that would normally use a hook or interval that isn't available here. If you want to use this timer, you'd need to run it in a real app environment (React Native, web app, etc.).

=====ANSWER=====

Request 16

Here's a pricing page with three plans and a monthly/yearly toggle. Swipe through the plans and toggle the billing period to see the prices update.

```prism
const [billing, setBilling] = useState("Monthly")

const plans = [
  {
    name: "Free",
    features: ["Up to 5 projects", "Basic support", "1 GB storage", "Community access"]
  },
  {
    name: "Pro",
    features: ["Unlimited projects", "Priority support", "100 GB storage", "Advanced analytics", "API access"]
  },
  {
    name: "Team",
    features: ["Everything in Pro", "Team collaboration", "Unlimited storage", "SSO & admin controls", "24/7 support"]
  }
]

const pricing = {
  Free: { Monthly: 0, Yearly: 0 },
  Pro: { Monthly: 29, Yearly: 290 },
  Team: { Monthly: 99, Yearly: 990 }
}

const getPlanPrice = (planName) => pricing[planName][billing]
const isPlanFree = (planName) => getPlanPrice(planName) === 0

<Stack>
  <Choice value={billing} options={["Monthly", "Yearly"]} onChange={setBilling} />
  
  <Carousel>
    {plans.map(plan => (
      <Card key={plan.name} title={plan.name}>
        <Stack tight>
          {isPlanFree(plan.name) ? (
            <Text strong>Free forever</Text>
          ) : (
            <Stack tight>
              <Stat label="Price" value={`$${getPlanPrice(plan.name)}`} />
              <Text secondary>per {billing.toLowerCase()}</Text>
            </Stack>
          )}
          
          <Divider />
          
          <Stack tight>
            {plan.features.map((feature, i) => (
              <Text key={i} secondary>{feature}</Text>
            ))}
          </Stack>
          
          <Button main onPress={() => P.ask(`Sign up for ${plan.name}`)}>{isPlanFree(plan.name) ? "Get started" : "Choose plan"}</Button>
        </Stack>
      </Card>
    ))}
  </Carousel>
</Stack>
```

=====ANSWER=====

Request 17

```prism
<Card title="Steps" subtitle="Last 7 days">
  <Chart kind="bar" data={[4200, 8100, 6500, 10200, 7300, 3900, 9000]} labels={["Oct 15", "Oct 16", "Oct 17", "Oct 18", "Oct 19", "Oct 20", "Oct 21"]} label="Daily steps" />
  <Field label="Average" value="7614 steps" />
  <Field label="Best day" value="Oct 18 (10,200)" />
</Card>
```

Your best day was October 18th with over 10,000 steps. Your average for the week is about 7,600 steps a day.

=====ANSWER=====

Request 18

```prism
<Card>
  <Image src="headphones" alt="Black over-ear headphones" ratio="square" />
  <Stack>
    <Title>Premium Headphones</Title>
    <Text secondary>⭐ 4.5 · 128 reviews</Text>
    <Stat label="Price" value="$129" />
    <Button main>Add to cart</Button>
  </Stack>
</Card>
```

This creates a product card with the headphones image, title, star rating with review count, price, and a prominent add-to-cart button. The layout groups everything cleanly, and the main button stands out as the primary action.

=====ANSWER=====

Request 19

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [startDate, setStartDate] = useState("")
const [endDate, setEndDate] = useState("")

const destinations = ["Paris", "Tokyo", "Barcelona", "New York", "Bali", "Dubai"]

<Stack>
  {step === 1 && (
    <Card title="Step 1: Where are you going?">
      <Select 
        label="Destination" 
        value={destination} 
        options={destinations}
        onChange={setDestination}
        placeholder="Pick a destination"
      />
      <Button main disabled={!destination} onPress={() => setStep(2)}>Next</Button>
    </Card>
  )}
  
  {step === 2 && (
    <Card title="Step 2: When are you traveling?">
      <Input 
        label="Start date" 
        value={startDate} 
        onChange={setStartDate}
        placeholder="YYYY-MM-DD"
      />
      <Input 
        label="End date" 
        value={endDate} 
        onChange={setEndDate}
        placeholder="YYYY-MM-DD"
      />
      <Row>
        <Button onPress={() => setStep(1)}>Back</Button>
        <Button main disabled={!startDate || !endDate} onPress={() => setStep(3)}>Next</Button>
      </Row>
    </Card>
  )}
  
  {step === 3 && (
    <Card title="Step 3: Confirm your trip">
      <Field label="Destination" value={destination} />
      <Field label="Starts" value={startDate} />
      <Field label="Ends" value={endDate} />
      <Divider />
      <Row>
        <Button onPress={() => setStep(2)}>Edit</Button>
        <Button main onPress={() => P.toast("Trip saved!")}>Confirm</Button>
      </Row>
    </Card>
  )}
</Stack>
```

Pick a destination, set your dates, then confirm. Tap **Next** to move through the steps.

=====ANSWER=====

Request 20

```prism
const [voted, setVoted] = useState(false)
const [choice, setChoice] = useState(null)
const votes = { a: 48, b: 32, c: 54, d: 26 }
const total = Object.values(votes).reduce((sum, v) => sum + v, 0)
const options = [
  { id: "a", title: "Dark mode", votes: votes.a },
  { id: "b", title: "Offline access", votes: votes.b },
  { id: "c", title: "AI suggestions", votes: votes.c },
  { id: "d", title: "Team collaboration", votes: votes.d }
]

<Card title="Which feature should we build next?">
  {!voted ? (
    <Stack>
      {options.map(opt => (
        <Button key={opt.id} onPress={() => { setChoice(opt.id); setVoted(true); }}>
          {opt.title}
        </Button>
      ))}
    </Stack>
  ) : (
    <Stack tight>
      {options.map(opt => (
        <Stack key={opt.id} tight>
          <Row wrap>
            <Text strong>{opt.title}</Text>
            <Text secondary>{opt.votes} votes ({Math.round(opt.votes / total * 100)}%)</Text>
          </Row>
          <Progress value={opt.votes / Math.max(...Object.values(votes))} status={opt.id === choice ? "good" : "bad"} />
        </Stack>
      ))}
      <Divider />
      <Text secondary>You voted for: <Text strong>{options.find(o => o.id === choice).title}</Text></Text>
      <Button onPress={() => { setVoted(false); setChoice(null); }}>Change vote</Button>
    </Stack>
  )}
</Card>
```
