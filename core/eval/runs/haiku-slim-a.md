Request 1

```prism
const [bill, setBill] = useState(50)
const [tipPercent, setTipPercent] = useState(18)
const [people, setPeople] = useState(2)

const billAmount = bill ?? 0
const peopleCount = people ?? 1
const tip = billAmount * (tipPercent / 100)
const total = billAmount + tip
const perPerson = total / peopleCount

<Card title="Tip Calculator">
  <Input label="Bill amount" kind="number" value={bill} onChange={setBill} />
  <Slider label="Tip percentage" value={tipPercent} min={0} max={30} onChange={setTipPercent} />
  <Input label="Split between" kind="number" value={people} onChange={setPeople} />
  <Divider />
  <Field label="Tip amount" value={"$" + tip.toFixed(2)} />
  <Field label="Total bill" value={"$" + total.toFixed(2)} />
  <Stat label="Per person" value={"$" + perPerson.toFixed(2)} />
</Card>
```

Enter the bill amount, pick your tip percentage (15% is standard, 18–20% is generous), and say how many people are splitting it. The calculator shows the tip, the total, and what each person pays.

=====ANSWER=====

Request 2

```prism
const [selected, setSelected] = useState("")

<Stack>
  <Compare 
    items={[
      { name: "Basic", price: "$10/month", data: "5 GB" },
      { name: "Plus", price: "$20/month", data: "20 GB" },
      { name: "Max", price: "$35/month", data: "Unlimited" }
    ]} 
    fields={["price", "data"]}
    value={selected}
    onChange={setSelected}
  />
  {selected && <Button main onPress={() => P.ask(`I'll take the ${selected} plan`)}>Confirm {selected}</Button>}
</Stack>
```

Tap a plan to pick it, then confirm.

=====ANSWER=====

Request 3

```prism
const [exercises, setExercises] = useState([
  { id: 1, name: "Push-ups", done: false },
  { id: 2, name: "Running", done: false },
])
const [newExercise, setNewExercise] = useState("")
const completed = exercises.filter(e => e.done).length

const addExercise = () => {
  if (newExercise.trim()) {
    setExercises([...exercises, { id: Date.now(), name: newExercise, done: false }])
    setNewExercise("")
  }
}

const toggleExercise = (id, done) => {
  setExercises(exercises.map(e => e.id === id ? { ...e, done } : e))
}

const deleteExercise = (id) => {
  setExercises(exercises.filter(e => e.id !== id))
}

<Stack>
  <Stat label="Completed" value={`${completed}/${exercises.length}`} />
  <Card title="Today's workout">
    {exercises.map(ex => 
      <Row key={ex.id}>
        <Switch value={ex.done} onChange={v => toggleExercise(ex.id, v)} />
        <Text strike={ex.done}>{ex.name}</Text>
        <Button danger label="Delete" onPress={() => deleteExercise(ex.id)} size="sm" />
      </Row>
    )}
  </Card>
  <Card>
    <Input value={newExercise} onChange={setNewExercise} placeholder="Add an exercise" onSubmit={addExercise} />
    <Button main onPress={addExercise}>Add</Button>
  </Card>
</Stack>
```

Tap the switch to mark an exercise done. Type a new one and tap Add to build your workout.

=====ANSWER=====

Request 4

Here's your budget breakdown. Each bar shows what portion of your income goes to that category.

```prism
const income = 2500
const expenses = [
  { name: "Rent", amount: 1200 },
  { name: "Food", amount: 400 },
  { name: "Transport", amount: 150 },
  { name: "Fun", amount: 200 }
]
const spent = expenses.reduce((sum, e) => sum + e.amount, 0)
const remaining = income - spent

<Card title="Monthly Budget" subtitle={`₹${income} income`}>
  {expenses.map(e => (
    <Stack key={e.name} tight>
      <Row>
        <Text strong>{e.name}</Text>
        <Text secondary>₹{e.amount}</Text>
      </Row>
      <Progress value={e.amount / income} />
    </Stack>
  ))}
  <Divider />
  <Field label="Total spent" value={`₹${spent}`} />
  <Stat label="Remaining" value={`₹${remaining}`} status="good" />
</Card>
```

You're spending ₹1,950 of your ₹2,500 income, leaving **₹550** unallocated each month. Rent takes the biggest share at 48% of your income.

=====ANSWER=====

Request 5

```prism
const [volume, setVolume] = useState(70)
const [quietHours, setQuietHours] = useState(false)

<Card title="Notifications">
  <Slider 
    label="Volume" 
    value={volume} 
    min={0} 
    max={100} 
    step={5}
    onChange={setVolume}
  />
  <Field label="Current level" value={volume + "%"} />
  
  <Divider />
  
  <Switch 
    label="Quiet hours" 
    value={quietHours} 
    onChange={setQuietHours}
  />
  <Text secondary>
    {quietHours ? "Notifications silenced until 8 AM" : "All notifications will play sounds"}
  </Text>
</Card>
```

This lets you adjust notification volume with the slider and toggle quiet hours with the switch. The label updates to show what quiet hours means when it's on.

=====ANSWER=====

Request 6

Convert between kilometres and miles by editing either field—the other updates automatically.

```prism
const [km, setKm] = useState(10)
const miles = Number((km * 0.621371).toFixed(2))

const handleMilesChange = (v) => {
  setKm(v === null ? 0 : Number((v / 0.621371).toFixed(2)))
}

<Card title="Kilometres ⟷ Miles">
  <Input label="Kilometres" kind="number" value={km} onChange={(v) => setKm(v || 0)} />
  <Input label="Miles" kind="number" value={miles} onChange={handleMilesChange} />
</Card>
```

=====ANSWER=====

Request 7

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
  <Slider label="Height (cm)" value={height} min={50} max={250} step={1} onChange={setHeight} />
  <Slider label="Weight (kg)" value={weight} min={20} max={200} step={1} onChange={setWeight} />
  <Divider />
  <Stat label="Your BMI" value={bmi.toFixed(1)} />
  <Badge status={status}>{category}</Badge>
</Card>
```

Slide the heights and weight to find your BMI. It updates instantly and shows your category—normal weight is a BMI between 18.5 and 24.9.

=====ANSWER=====

Request 8

Here's your shopping list. Add items with quantities and check them off as you buy them—the list always shows how many are left to get.

```prism
const [items, setItems] = useState([])
const [name, setName] = useState("")
const [quantity, setQuantity] = useState(1)

const remaining = items.filter(item => !item.done)
const done = items.filter(item => item.done)

const addItem = () => {
  if (name.trim()) {
    setItems([...items, { id: Date.now(), name, quantity, done: false }])
    setName("")
    setQuantity(1)
  }
}

const toggleItem = (id) => {
  setItems(items.map(item => item.id === id ? { ...item, done: !item.done } : item))
}

const removeItem = (id) => {
  setItems(items.filter(item => item.id !== id))
}

<Stack>
  <Card title="Shopping List">
    <Input 
      label="Item name" 
      value={name} 
      onChange={setName}
      placeholder="e.g., Milk"
    />
    <Slider 
      label="Quantity" 
      value={quantity} 
      min={1} 
      max={20} 
      onChange={setQuantity}
    />
    <Button main onPress={addItem}>Add to list</Button>
  </Card>
  
  {remaining.length > 0 && (
    <Card title={`To buy: ${remaining.length}`}>
      {remaining.map(item => (
        <Row key={item.id} wrap>
          <Switch 
            value={false}
            onChange={() => toggleItem(item.id)}
            label={`${item.name} (${item.quantity})`}
          />
          <Button danger onPress={() => removeItem(item.id)} label="Remove">×</Button>
        </Row>
      ))}
    </Card>
  )}
  
  {done.length > 0 && (
    <Card title="Done">
      {done.map(item => (
        <Row key={item.id} wrap>
          <Switch 
            value={true}
            onChange={() => toggleItem(item.id)}
            label={`${item.name} (${item.quantity})`}
          />
          <Button danger onPress={() => removeItem(item.id)} label="Remove">×</Button>
        </Row>
      ))}
    </Card>
  )}
  
  {items.length === 0 && (
    <Text secondary>Add items to get started</Text>
  )}
</Stack>
```

=====ANSWER=====

Request 9

Here's an interactive solar system quiz with 3 questions. Answer all three and see your final score.

```prism
const [currentQuestion, setCurrentQuestion] = useState(0)
const [score, setScore] = useState(0)
const [quizComplete, setQuizComplete] = useState(false)
const [answered, setAnswered] = useState(false)
const [selectedAnswer, setSelectedAnswer] = useState(null)

const questions = [
  {
    question: "Which planet is closest to the Sun?",
    options: ["Venus", "Mercury", "Earth", "Mars"],
    answer: 1
  },
  {
    question: "How many moons does Saturn have?",
    options: ["15", "27", "83+", "52"],
    answer: 2
  },
  {
    question: "What is the largest planet in our solar system?",
    options: ["Saturn", "Neptune", "Jupiter", "Uranus"],
    answer: 2
  }
]

const q = questions[currentQuestion]
const percentage = Math.round((score / questions.length) * 100)

const handleAnswer = (idx) => {
  setSelectedAnswer(idx)
  setAnswered(true)
  if (idx === q.answer) {
    setScore(score + 1)
  }
}

const handleNext = () => {
  if (currentQuestion < 2) {
    setCurrentQuestion(currentQuestion + 1)
    setAnswered(false)
    setSelectedAnswer(null)
  } else {
    setQuizComplete(true)
  }
}

const handleRestart = () => {
  setCurrentQuestion(0)
  setScore(0)
  setQuizComplete(false)
  setAnswered(false)
  setSelectedAnswer(null)
}

return quizComplete ? (
  <Card title="Quiz Complete! 🎉">
    <Stack>
      <Stat label="Your Score" value={`${score}/3`} />
      <Field label="Percentage" value={`${percentage}%`} />
    </Stack>
    <Button main onPress={handleRestart}>Start Over</Button>
  </Card>
) : (
  <Card title={`Question ${currentQuestion + 1}/3`} subtitle={q.question}>
    <Stack>
      {q.options.map((option, idx) => (
        <Button key={idx} onPress={() => handleAnswer(idx)} disabled={answered}>
          {option}
        </Button>
      ))}
      {answered && <Callout status={selectedAnswer === q.answer ? "good" : "bad"}>
        {selectedAnswer === q.answer ? "Correct! ✓" : `The correct answer is: ${q.options[q.answer]}`}
      </Callout>}
      {answered && <Button main onPress={handleNext}>
        {currentQuestion === 2 ? "See Score" : "Next"}
      </Button>}
    </Stack>
  </Card>
)
```

=====ANSWER=====

Request 10

```prism
const [servings, setServings] = useState(4)
const scale = servings / 4

// Base recipe for 4 servings (12 pancakes)
const ingredients = [
  { name: "Flour", amount: 2 * scale, unit: "cups" },
  { name: "Sugar", amount: 2 * scale, unit: "tbsp" },
  { name: "Baking powder", amount: 2 * scale, unit: "tsp" },
  { name: "Salt", amount: 1 * scale, unit: "tsp" },
  { name: "Milk", amount: 2 * scale, unit: "cups" },
  { name: "Eggs", amount: 2 * scale, unit: "" },
  { name: "Butter, melted", amount: 2 * scale, unit: "tbsp" },
  { name: "Vanilla extract", amount: 1 * scale, unit: "tsp" }
]

function formatAmount(num) {
  if (num < 0.1) return "pinch"
  if (Math.abs(num - Math.round(num)) < 0.05) return Math.round(num).toString()
  return (Math.round(num * 4) / 4).toString()
}

<Stack>
  <Card title="Pancake Recipe">
    <Slider label="Servings" value={servings} min={1} max={12} step={1} onChange={setServings} />
    <Text secondary>Makes about {Math.round(servings / 4 * 12)} pancakes</Text>
  </Card>
  
  <Card title="Ingredients">
    {ingredients.map((ing, i) => (
      <Field key={i} label={ing.name} value={formatAmount(ing.amount) + (ing.unit ? " " + ing.unit : "")} />
    ))}
  </Card>
  
  <Card title="How to Make">
    <Steps>
      <Step title="Mix dry">Whisk together flour, sugar, baking powder, and salt in a large bowl.</Step>
      <Step title="Mix wet">In another bowl, whisk milk, eggs, melted butter, and vanilla.</Step>
      <Step title="Combine">Pour wet into dry. Stir until just combined—lumps are fine.</Step>
      <Step title="Cook">Heat a griddle over medium heat. Pour 1/4 cup batter per pancake. Cook 1–2 min until set, flip, cook 1–2 min more until golden.</Step>
      <Step title="Serve">Plate up and top with syrup, butter, fruit, or berries.</Step>
    </Steps>
  </Card>
</Stack>
```

Slide the servings up or down and all the ingredient amounts will adjust. The recipe scales to anything from 1 to 12 servings.

=====ANSWER=====

Request 11

```prism
const total = 90
const chrisCost = 12
const splitCost = (total - chrisCost) / 2

<Card title="Bill split">
  <Field label="Total" value={"$" + total} />
  <Divider />
  <Field label="Chris (salad)" value={"$" + chrisCost} />
  <Field label="Ana" value={"$" + splitCost} />
  <Field label="Ben" value={"$" + splitCost} />
</Card>
```

**Chris pays $12** for his salad. **Ana and Ben each pay $39** for their share of the remaining $78.

=====ANSWER=====

Request 12

Here's an interactive habit tracker for your week. Tap any day to check off when you complete a habit.

```prism
const [habits, setHabits] = useState([
  { id: 1, name: "Morning Run", done: [false, true, false, true, false, true, false] },
  { id: 2, name: "Meditate", done: [true, true, false, true, true, false, true] },
  { id: 3, name: "Read", done: [true, false, true, false, true, false, false] }
])

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function toggleDay(habitId, dayIndex) {
  setHabits(habits.map(h => 
    h.id === habitId 
      ? { ...h, done: h.done.map((d, i) => i === dayIndex ? !d : d) }
      : h
  ))
}

const totalDone = habits.reduce((sum, h) => sum + h.done.filter(d => d).length, 0)
const totalPossible = habits.length * 7

<Stack>
  <Progress value={totalDone / totalPossible} label={`${totalDone}/${totalPossible} completed`} />
  
  {habits.map(habit => {
    const completed = habit.done.filter(d => d).length
    return (
      <Card key={habit.id} title={habit.name} subtitle={`${completed}/7 days`}>
        <Row wrap>
          {days.map((day, dayIndex) => (
            <Button
              key={day}
              onPress={() => toggleDay(habit.id, dayIndex)}
            >
              {habit.done[dayIndex] ? `✓ ${day}` : day}
            </Button>
          ))}
        </Row>
      </Card>
    )
  })}
</Stack>
```

=====ANSWER=====

Request 13

```prism
<Stack>
  <Card title="London" subtitle="Now">
    <Stat label="Temperature" value="18°C" />
    <Divider />
    <Field label="Conditions" value="Cloudy" />
    <Field label="Humidity" value="60%" />
    <Field label="Wind" value="12 km/h" />
  </Card>
  
  <Card title="Next 3 hours">
    <Stack tight>
      <Row>
        <Text secondary>15:00</Text>
        <Text>18°C, Cloudy</Text>
      </Row>
      <Row>
        <Text secondary>16:00</Text>
        <Text>17°C, Cloudy</Text>
      </Row>
      <Row>
        <Text secondary>17:00</Text>
        <Text>16°C, Overcast</Text>
      </Row>
    </Stack>
  </Card>
</Stack>
```

Current conditions in London are mild with cloud cover. Expect a gradual cooling over the next few hours, with the wind steady at around 12 km/h.

=====ANSWER=====

Request 14

Here's a sign-up form that validates all fields and shows real-time password strength feedback.

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")

const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, text: "" }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^a-zA-Z0-9]/.test(pwd)) score++
  
  const texts = ["Very weak", "Weak", "Fair", "Good", "Strong", "Very strong"]
  const statuses = ["bad", "bad", "warning", "warning", "good", "good"]
  return { score, text: texts[score], status: statuses[score] }
}

const strength = getPasswordStrength(password)
const isComplete = name.trim() && email.trim() && password.trim()

<Card title="Create account">
  <Input label="Name" value={name} onChange={setName} placeholder="Ada Lovelace" />
  <Input label="Email" value={email} onChange={setEmail} placeholder="example@email.com" kind="email" />
  <Input label="Password" value={password} onChange={setPassword} kind="password" />
  {password && (
    <Stack tight>
      <Progress value={strength.score / 5} status={strength.status} />
      <Text secondary status={strength.status}>{strength.text}</Text>
    </Stack>
  )}
  <Button main disabled={!isComplete}>Sign up</Button>
</Card>
```

The password strength is based on five criteria: length (8+ and 12+), uppercase letters, numbers, and special characters. The submit button lights up only when all three fields are filled.

=====ANSWER=====

Request 15

```prism
const [seconds, setSeconds] = useState(300)
const [isRunning, setIsRunning] = useState(false)

const minutes = Math.floor(seconds / 60)
const secs = seconds % 60
const timeDisplay = `${minutes}:${secs.toString().padStart(2, '0')}`

<Card title="5-Minute Timer">
  <Stack tight>
    <Text strong size="lg" style={{ textAlign: 'center', fontSize: 48 }}>{timeDisplay}</Text>
    <Row>
      <Button main onPress={() => setIsRunning(!isRunning)}>
        {isRunning ? "Pause" : "Start"}
      </Button>
      <Button onPress={() => { setSeconds(300); setIsRunning(false); }}>Reset</Button>
    </Row>
  </Stack>
</Card>
```

**Note:** This shows the timer interface, but to make it actually count down automatically, you'd need a real app with timer capabilities. For a working countdown, you could use a timer app on your phone or a web-based timer like timer-tab.com.

=====ANSWER=====

Request 16

```prism
const [billing, setBilling] = useState("monthly")

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    features: ["Up to 5 projects", "Basic analytics", "Community support"],
    cta: "Get started"
  },
  {
    name: "Pro",
    monthlyPrice: 29,
    features: ["Unlimited projects", "Advanced analytics", "Email support", "Custom domain"],
    cta: "Start free trial",
    popular: true
  },
  {
    name: "Team",
    monthlyPrice: 99,
    features: ["Everything in Pro", "Team collaboration", "Priority support", "SSO & security"],
    cta: "Contact sales"
  }
]

const getPrice = (monthlyPrice) => {
  if (billing === "monthly") return monthlyPrice
  return Math.round(monthlyPrice * 12 * 0.83)
}

<Stack>
  <Title>Choose your plan</Title>
  <Choice value={billing} options={["Monthly", "Yearly"]} onChange={(v) => setBilling(v.toLowerCase())} />
  
  {plans.map((plan) => (
    <Card key={plan.name} title={plan.name}>
      {plan.popular && <Badge>Most popular</Badge>}
      <Stack tight>
        <Row tight>
          <Text strong>${getPrice(plan.monthlyPrice)}</Text>
          <Text secondary>per {billing === "monthly" ? "month" : "year"}</Text>
        </Row>
        {plan.features.map((feature) => (
          <Text key={feature} secondary>• {feature}</Text>
        ))}
        <Button main onPress={() => P.ask(`I want to ${plan.cta.toLowerCase()}`)}>{plan.cta}</Button>
      </Stack>
    </Card>
  ))}
</Stack>
```

Toggle between monthly and yearly—prices update with an automatic 17% annual discount. Each plan shows features and a call-to-action button.

=====ANSWER=====

Request 17

Here's your week of steps:

```prism
<Card title="Steps - Last 7 Days">
  <Chart kind="bar" data={[4200, 8100, 6500, 10200, 7300, 3900, 9000]} labels={["15", "16", "17", "18", "19", "20", "21"]} label="Daily steps" />
</Card>
```

Your best day was the 18th with 10,200 steps. The 21st (today) looks good at 9,000—keep it up!

=====ANSWER=====

Request 18

```prism
<Card>
  <Image src="headphones" alt="Black over-ear headphones" ratio="square" />
  <Divider />
  <Title>Premium Headphones</Title>
  <Text secondary>Rating: 4.5 ★</Text>
  <Field label="Price" value="$129" />
  <Button main onPress={() => P.toast("Added to cart!")}>Add to cart</Button>
</Card>
```

=====ANSWER=====

Request 19

I'll build a 3-step wizard that guides you through planning a trip: choose where, when, and confirm.

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [startDate, setStartDate] = useState("")
const [endDate, setEndDate] = useState("")

<Card>
  <Steps>
    <Step title={step >= 1 ? "✓" : "1"}>Destination</Step>
    <Step title={step >= 2 ? "✓" : "2"}>Dates</Step>
    <Step title={step >= 3 ? "✓" : "3"}>Confirm</Step>
  </Steps>
  
  <Divider />
  
  {step === 1 && (
    <Stack>
      <Title>Where are you going?</Title>
      <Select 
        label="Destination"
        value={destination}
        options={["Paris", "Tokyo", "New York", "Barcelona", "Bangkok", "Dubai"]}
        onChange={setDestination}
        placeholder="Choose a destination"
      />
      <Button main disabled={!destination} onPress={() => setStep(2)}>Next</Button>
    </Stack>
  )}
  
  {step === 2 && (
    <Stack>
      <Title>When are you traveling?</Title>
      <Input 
        label="Start date" 
        placeholder="YYYY-MM-DD"
        value={startDate}
        onChange={setStartDate}
      />
      <Input 
        label="End date" 
        placeholder="YYYY-MM-DD"
        value={endDate}
        onChange={setEndDate}
      />
      <Row>
        <Button onPress={() => setStep(1)}>Back</Button>
        <Button main disabled={!startDate || !endDate} onPress={() => setStep(3)}>Next</Button>
      </Row>
    </Stack>
  )}
  
  {step === 3 && (
    <Stack>
      <Title>Confirm your trip</Title>
      <Field label="Destination" value={destination} />
      <Field label="Departure" value={startDate} />
      <Field label="Return" value={endDate} />
      <Row>
        <Button onPress={() => setStep(2)}>Back</Button>
        <Button main onPress={() => P.toast("Trip booked! 🎉")}>Confirm</Button>
      </Row>
    </Stack>
  )}
</Card>
```

Each step validates before moving forward—pick a destination, add dates, then review and confirm.

=====ANSWER=====

Request 20

Here's an interactive poll that shows results after you vote:

```prism
const [voted, setVoted] = useState(null)
const [votes, setVotes] = useState({
  dark: 142,
  export: 89,
  collab: 156,
  offline: 73
})

const options = [
  { id: "dark", label: "Dark mode" },
  { id: "export", label: "Export to PDF" },
  { id: "collab", label: "Real-time collaboration" },
  { id: "offline", label: "Offline mode" }
]

const total = Object.values(votes).reduce((a, b) => a + b, 0)

const handleVote = (optionId) => {
  setVoted(optionId)
  setVotes({ ...votes, [optionId]: votes[optionId] + 1 })
}

<Stack>
  <Title>Which feature should we build next?</Title>
  {voted ? (
    <Stack>
      {options.map(opt => {
        const percent = Math.round((votes[opt.id] / total) * 100)
        return (
          <Stack tight key={opt.id}>
            <Row tight>
              <Text strong>{opt.label}</Text>
              <Text secondary>{votes[opt.id]} votes</Text>
            </Row>
            <Progress value={percent / 100} />
            <Text secondary>{percent}%</Text>
          </Stack>
        )
      })}
      <Divider />
      <Field label="Total votes" value={total.toString()} />
    </Stack>
  ) : (
    <Stack>
      {options.map(opt => (
        <Button key={opt.id} onPress={() => handleVote(opt.id)}>
          {opt.label}
        </Button>
      ))}
    </Stack>
  )}
</Stack>
```

Tap any option to vote—the results appear instantly with vote counts, percentages, and a progress bar for each feature.
