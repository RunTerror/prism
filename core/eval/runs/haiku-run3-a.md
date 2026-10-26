Here is a tip calculator. Enter the bill, the tip and the number of people.

```prism
const [bill, setBill] = useState(0)
const [people, setPeople] = useState(2)
const [tip, setTip] = useState(15)
const b = bill || 0
const total = b + b * tip / 100
const each = people > 0 ? total / people : 0

<Card title="Tip calculator">
  <Stack gap="md">
    <Input label="Bill" kind="number" value={bill} onChange={setBill} placeholder="0" />
    <Slider label="Tip (%)" value={tip} min={0} max={30} step={1} onChange={setTip} />
    <Slider label="People" value={people} min={1} max={20} step={1} onChange={setPeople} />
    <Divider />
    <Stat label="Each person pays" value={"$" + each.toFixed(2)} />
    <Text tone="muted" size="sm">Total with tip: ${total.toFixed(2)}</Text>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a comparison of the three plans. Tap one to choose it.

```prism
const [choice, setChoice] = useState("")
const plans = [
  { name: "Basic", price: "$10", data: "5 GB" },
  { name: "Plus", price: "$20", data: "20 GB" },
  { name: "Max", price: "$35", data: "Unlimited" }
]

<Stack gap="md">
  <Title size="sm">Pick a phone plan</Title>
  {plans.map(p => (
    <Card key={p.name} title={p.name} subtitle={p.data + " of data"}>
      <Row justify="between">
        <Stat label="Per month" value={p.price} />
        <Button variant={choice === p.name ? "solid" : "outline"} onPress={() => setChoice(p.name)}>{choice === p.name ? "Chosen" : "Choose"}</Button>
      </Row>
    </Card>
  ))}
  {choice !== "" && <Callout tone="success" title="Plan chosen">You picked {choice}.</Callout>}
</Stack>
```
=====ANSWER=====
Here is a workout tracker. Add exercises and tick them off as you go.

```prism
const [exercises, setExercises] = useState([{ id: 1, name: "Push-ups", done: false }])
const [draft, setDraft] = useState("")
const doneCount = exercises.filter(e => e.done).length

<Card title="Workout" subtitle={doneCount + " of " + exercises.length + " done"}>
  {exercises.map(e => (
    <Checkbox key={e.id} label={e.name} value={e.done}
      onChange={v => setExercises(exercises.map(x => x.id === e.id ? { ...x, done: v } : x))} />
  ))}
  <Row>
    <Input value={draft} onChange={setDraft} placeholder="New exercise" />
    <Button icon="plus" disabled={!draft.trim()} onPress={() => {
      setExercises([...exercises, { id: Date.now(), name: draft.trim(), done: false }])
      setDraft("")
    }}>Add</Button>
  </Row>
  <Progress value={exercises.length ? doneCount / exercises.length : 0} label="Progress" />
</Card>
```
=====ANSWER=====
Here is your monthly budget.

```prism
const income = 2500
const items = [
  { name: "Rent", amount: 1200 },
  { name: "Food", amount: 400 },
  { name: "Transport", amount: 150 },
  { name: "Fun", amount: 200 }
]
const spent = items.reduce((s, i) => s + i.amount, 0)
const left = income - spent

<Card title="Monthly budget" subtitle="Income $2500">
  <Grid columns={2}>
    <Stat label="Spent" value={"$" + spent} />
    <Stat label="Left" value={"$" + left} tone={left < 0 ? "danger" : "success"} />
  </Grid>
  <Progress value={spent / income} label="Used" tone={spent > income ? "danger" : "primary"} />
  <Table>
    {items.map(i => (
      <TableRow key={i.name}>
        <Cell>{i.name}</Cell>
        <Cell align="end">{"$" + i.amount}</Cell>
      </TableRow>
    ))}
  </Table>
</Card>
```
=====ANSWER=====
Here is the notification settings screen.

```prism
const [notifications, setNotifications] = useState(true)
const [volume, setVolume] = useState(60)
const [quiet, setQuiet] = useState(false)

<Card title="Notifications">
  <Switch label="Notifications" value={notifications} onChange={setNotifications} />
  <Slider label="Volume" value={volume} min={0} max={100} step={1} onChange={setVolume} />
  <Switch label="Quiet hours" value={quiet} onChange={setQuiet} />
  <Text tone="muted" size="sm">{quiet ? "Notifications are muted at night." : "Notifications can come at any time."}</Text>
</Card>
```
=====ANSWER=====
Here is a converter between kilometres and miles. Type a value and pick the direction.

```prism
const [value, setValue] = useState(1)
const [fromKm, setFromKm] = useState(true)
const v = value || 0
const result = fromKm ? v * 0.621371 : v / 0.621371
const from = fromKm ? "km" : "miles"
const to = fromKm ? "miles" : "km"

<Card title="Distance converter">
  <Select label="Convert from" value={fromKm ? "km" : "miles"} options={["km", "miles"]} onChange={c => setFromKm(c === "km")} />
  <Input label={"Value in " + from} kind="number" value={value} onChange={setValue} />
  <Stat label={"In " + to} value={String(Math.round(result * 1000) / 1000) + " " + to} />
</Card>
```
=====ANSWER=====
Here is a BMI calculator. Enter your height and weight.

```prism
const [height, setHeight] = useState(170)
const [weight, setWeight] = useState(70)
const h = (height || 0) / 100
const w = weight || 0
const bmi = h > 0 ? w / (h * h) : 0
const rounded = Math.round(bmi * 10) / 10
let category = "Healthy weight"
let tone = "success"
if (bmi < 18.5) { category = "Underweight"; tone = "warning" }
else if (bmi >= 25 && bmi < 30) { category = "Overweight"; tone = "warning" }
else if (bmi >= 30) { category = "Obesity"; tone = "danger" }

<Card title="BMI calculator">
  <Input label="Height (cm)" kind="number" value={height} onChange={setHeight} />
  <Input label="Weight (kg)" kind="number" value={weight} onChange={setWeight} />
  <Stat label="Your BMI" value={String(rounded)} />
  <Callout tone={tone} title={category}>BMI is a rough guide. It does not measure body fat.</Callout>
</Card>
```
=====ANSWER=====
Here is your shopping list. Add items with a quantity and tick them off when bought.

```prism
const [items, setItems] = useState([{ id: 1, name: "Eggs", qty: 12, bought: false }])
const [name, setName] = useState("")
const [qty, setQty] = useState(1)
const left = items.filter(i => !i.bought).length

<Card title="Shopping list" subtitle={left + " left to buy"}>
  {items.map(i => (
    <Checkbox key={i.id} label={i.name + " x" + i.qty} value={i.bought}
      onChange={v => setItems(items.map(x => x.id === i.id ? { ...x, bought: v } : x))} />
  ))}
  <Divider />
  <Input label="Item" value={name} onChange={setName} placeholder="Milk" />
  <Input label="Quantity" kind="number" value={qty} onChange={setQty} />
  <Button icon="plus" disabled={!name.trim()} onPress={() => {
    setItems([...items, { id: Date.now(), name: name.trim(), qty: qty || 1, bought: false }])
    setName("")
    setQty(1)
  }}>Add item</Button>
</Card>
```
=====ANSWER=====
Here is a 3-question quiz about the solar system.

```prism
const questions = [
  { q: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Mars"], answer: "Mercury" },
  { q: "Which planet is the largest?", options: ["Saturn", "Neptune", "Jupiter"], answer: "Jupiter" },
  { q: "What is at the centre of our solar system?", options: ["The Moon", "The Sun", "Earth"], answer: "The Sun" }
]
const [step, setStep] = useState(0)
const [picked, setPicked] = useState("")
const [score, setScore] = useState(0)
const [finished, setFinished] = useState(false)
const current = questions[step]

<Card title="Solar system quiz" subtitle={finished ? "Done" : "Question " + (step + 1) + " of 3"}>
  {finished ? (
    <Stack gap="md">
      <Stat label="Your score" value={score + " of 3"} tone={score === 3 ? "success" : "neutral"} />
      <Button onPress={() => { setStep(0); setPicked(""); setScore(0); setFinished(false) }}>Try again</Button>
    </Stack>
  ) : (
    <Stack gap="md">
      <Title size="sm">{current.q}</Title>
      <Stack gap="sm">
        {current.options.map(o => (
          <Button key={o} variant={picked === o ? "solid" : "outline"} onPress={() => setPicked(o)}>{o}</Button>
        ))}
      </Stack>
      <Button disabled={!picked} onPress={() => {
        if (picked === current.answer) { setScore(score + 1) }
        setPicked("")
        if (step === questions.length - 1) { setFinished(true) } else { setStep(step + 1) }
      }}>{step === questions.length - 1 ? "See score" : "Next"}</Button>
    </Stack>
  )}
</Card>
```
=====ANSWER=====
Here is the pancake recipe. Change the servings and the amounts scale.

```prism
const [servings, setServings] = useState(4)
const k = (servings || 1) / 4
const ingredients = [
  { name: "Flour", amount: 150, unit: "g" },
  { name: "Milk", amount: 300, unit: "ml" },
  { name: "Eggs", amount: 2, unit: "" },
  { name: "Butter, melted", amount: 2, unit: "tbsp" },
  { name: "Sugar", amount: 1, unit: "tbsp" }
]

<Card title="Pancakes" subtitle="Base recipe makes 4 servings">
  <Slider label={"Servings: " + servings} value={servings} min={1} max={12} step={1} onChange={setServings} />
  <Table>
    {ingredients.map(i => (
      <TableRow key={i.name}>
        <Cell>{i.name}</Cell>
        <Cell align="end">{String(Math.round(i.amount * k * 10) / 10) + " " + i.unit}</Cell>
      </TableRow>
    ))}
  </Table>
  <Text tone="muted" size="sm">Cook each pancake on a medium heat until golden on both sides.</Text>
</Card>
```
=====ANSWER=====
Here is the dinner split. Chris pays his $12 salad, and the rest of the $90 is shared equally between all three.

```prism
const bill = 90
const chrisSalad = 12
const shared = (bill - chrisSalad) / 3
const shares = [
  { name: "Ana", pays: shared },
  { name: "Ben", pays: shared },
  { name: "Chris", pays: shared + chrisSalad }
]

<Card title="Dinner split" subtitle="Bill $90">
  <Table>
    {shares.map(s => (
      <TableRow key={s.name}>
        <Cell>{s.name}</Cell>
        <Cell align="end">{"$" + s.pays.toFixed(2)}</Cell>
      </TableRow>
    ))}
  </Table>
  <Text tone="muted" size="sm">Chris pays his $12 salad plus an equal share of the rest.</Text>
</Card>
```
=====ANSWER=====
Here is your habit tracker for this week. Tick each day you did a habit.

```prism
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const [habits, setHabits] = useState([
  { id: 1, name: "Read 20 min", done: [false, false, false, false, false, false, false] },
  { id: 2, name: "Walk", done: [false, false, false, false, false, false, false] },
  { id: 3, name: "Drink water", done: [false, false, false, false, false, false, false] }
])
const total = habits.reduce((s, h) => s + h.done.filter(d => d).length, 0)

function toggle(hid, di, v) {
  return habits.map(h => h.id === hid ? { ...h, done: h.done.map((d, i) => i === di ? v : d) } : h)
}

<Card title="This week" subtitle={total + " of 21 ticked"}>
  {habits.map(h => (
    <Stack key={h.id} gap="sm">
      <Text weight="semibold">{h.name}</Text>
      <Row wrap>
        {days.map((d, i) => (
          <Checkbox key={d} label={d} value={h.done[i]} onChange={v => setHabits(toggle(h.id, i, v))} />
        ))}
      </Row>
    </Stack>
  ))}
</Card>
```
=====ANSWER=====
Here is today's weather in London. The next 3 hours are not in what you gave me, so the screen says so instead of making them up.

```prism
<Card title="Weather in London" subtitle="Now">
  <Grid columns={2}>
    <Stat label="Temperature" value="18°C" />
    <Stat label="Sky" value="Cloudy" />
    <Stat label="Humidity" value="60%" />
    <Stat label="Wind" value="12 km/h" />
  </Grid>
  <Callout tone="info" title="Next 3 hours">The hourly forecast is not available yet.</Callout>
</Card>
```
=====ANSWER=====
Here is the sign-up form. The submit button turns on when all three fields are filled in.

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const filled = name.trim() !== "" && email.trim() !== "" && password !== ""
let strength = 0
if (password.length >= 8) { strength = strength + 1 }
if (/[A-Z]/.test(password) && /[a-z]/.test(password)) { strength = strength + 1 }
if (/[0-9]/.test(password)) { strength = strength + 1 }
if (/[^A-Za-z0-9]/.test(password)) { strength = strength + 1 }
const hint = strength <= 1 ? "Weak" : strength <= 3 ? "Fair" : "Strong"
const hintTone = strength <= 1 ? "danger" : strength <= 3 ? "warning" : "success"

<Card title="Sign up">
  <Input label="Name" value={name} onChange={setName} placeholder="Ada" />
  <Input label="Email" kind="email" value={email} onChange={setEmail} placeholder="you@example.com" />
  <Input label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" />
  {password !== "" && <Text tone={hintTone} size="sm">Password strength: {hint}</Text>}
  <Button disabled={!filled} onPress={() => P.toast("Account created")}>Sign up</Button>
</Card>
```
=====ANSWER=====
Here is a 5-minute countdown. Start, pause and reset work, but the screen cannot count down by itself, so the minute button moves the time along by hand.

```prism
const [seconds, setSeconds] = useState(300)
const [running, setRunning] = useState(false)
const mins = Math.floor(seconds / 60)
const secs = seconds % 60
const label = (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs

<Card title="Countdown" subtitle={running ? "Running" : "Ready"}>
  <Stack gap="md" align="center">
    <Title size="xl">{label}</Title>
    <Progress value={seconds / 300} />
    <Row justify="center">
      <Button onPress={() => setRunning(!running)}>{running ? "Pause" : "Start"}</Button>
      <Button variant="outline" onPress={() => { setSeconds(300); setRunning(false) }}>Reset</Button>
    </Row>
    <Button variant="ghost" disabled={!running || seconds === 0} onPress={() => setSeconds(Math.max(0, seconds - 60))}>Count down 1 minute</Button>
  </Stack>
</Card>
```
=====ANSWER=====
Here is the pricing page. Switch on Yearly to see the yearly prices.

```prism
const [yearly, setYearly] = useState(false)
const plans = [
  { name: "Free", monthly: 0, yearly: 0, perks: "1 user, basic features" },
  { name: "Pro", monthly: 10, yearly: 100, perks: "Unlimited projects" },
  { name: "Team", monthly: 25, yearly: 250, perks: "Everything in Pro, plus team tools" }
]

<Stack gap="md">
  <Row justify="between">
    <Title size="sm">Pricing</Title>
    <Switch label="Yearly" value={yearly} onChange={setYearly} />
  </Row>
  {plans.map(p => (
    <Card key={p.name} title={p.name} subtitle={p.perks}>
      <Row justify="between" align="end">
        <Stat label={yearly ? "Per year" : "Per month"} value={"$" + (yearly ? p.yearly : p.monthly)} />
        <Button variant={p.name === "Pro" ? "solid" : "outline"} onPress={() => P.toast("Chose " + p.name)}>Choose {p.name}</Button>
      </Row>
    </Card>
  ))}
</Stack>
```
=====ANSWER=====
Here is the bar chart of your steps for the last 7 days. The average is about 7,029 a day.

```prism
const steps = [4200, 8100, 6500, 10200, 7300, 3900, 9000]
const days = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]

<Card title="Steps, last 7 days" subtitle="Daily steps">
  <Chart kind="bar" data={steps} labels={days} label="Steps per day" />
  <Stat label="Daily average" value="7,029" />
</Card>
```
=====ANSWER=====
Here is the headphones product card.

```prism
const [added, setAdded] = useState(false)

<Card pad="none">
  <Image src="headphones" alt="Black over-ear headphones on a yellow background" ratio="square" />
  <Stack gap="sm" pad="lg">
    <Title size="sm">Over-ear headphones</Title>
    <Row gap="xs">
      {[1, 2, 3, 4].map(n => <Icon key={n} name="star" size="sm" tone="warning" />)}
      <Text size="sm" tone="muted">4.5 out of 5</Text>
    </Row>
    <Title size="xl">$129</Title>
    <Button icon="plus" disabled={added} onPress={() => { setAdded(true); P.toast("Added to cart") }}>{added ? "In cart" : "Add to cart"}</Button>
  </Stack>
</Card>
```
=====ANSWER=====
Here is the 3-step trip planner. Go through the steps and confirm at the end.

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [start, setStart] = useState("")
const [end, setEnd] = useState("")
const dateOk = start !== "" && end !== "" && end >= start
const canNext = step === 1 ? destination.trim() !== "" : step === 2 ? dateOk : true

<Card title="Plan your trip" subtitle={"Step " + step + " of 3"}>
  {step === 1 && (
    <Stack gap="md">
      <Title size="sm">Where do you want to go?</Title>
      <Input label="Destination" value={destination} onChange={setDestination} placeholder="Lisbon" />
    </Stack>
  )}
  {step === 2 && (
    <Stack gap="md">
      <Title size="sm">When are you going?</Title>
      <Input label="Start date" value={start} onChange={setStart} placeholder="2026-11-01" />
      <Input label="End date" value={end} onChange={setEnd} placeholder="2026-11-07" />
      {!dateOk && start !== "" && end !== "" && <Callout tone="warning" title="Check dates">The end date must be after the start.</Callout>}
    </Stack>
  )}
  {step === 3 && (
    <Stack gap="md">
      <Title size="sm">Confirm your trip</Title>
      <Text>{destination}</Text>
      <Text tone="muted">{start} to {end}</Text>
    </Stack>
  )}
  <Row justify="between">
    <Button variant="outline" disabled={step === 1} onPress={() => setStep(step - 1)}>Back</Button>
    {step < 3 ? (
      <Button disabled={!canNext} onPress={() => setStep(step + 1)}>Next</Button>
    ) : (
      <Button icon="check" onPress={() => P.toast("Trip confirmed")}>Confirm</Button>
    )}
  </Row>
</Card>
```
=====ANSWER=====
Here is the poll. Tap an option to vote, and the results show up.

```prism
const options = ["Dark mode", "Offline mode", "Widgets", "Export to PDF"]
const [votes, setVotes] = useState([12, 8, 5, 3])
const [voted, setVoted] = useState(-1)
const total = votes.reduce((s, n) => s + n, 0)

<Card title="Which feature should we build next?">
  {voted < 0 ? (
    <Stack gap="sm">
      {options.map((o, i) => (
        <Button key={o} variant="outline" onPress={() => {
          setVotes(votes.map((v, j) => j === i ? v + 1 : v))
          setVoted(i)
        }}>{o}</Button>
      ))}
    </Stack>
  ) : (
    <Stack gap="md">
      {options.map((o, i) => (
        <Progress key={o} value={votes[i] / total} label={o + " (" + votes[i] + ")"} tone={i === voted ? "primary" : "neutral"} />
      ))}
      <Text tone="muted" size="sm">Thanks for voting. {total} votes so far.</Text>
    </Stack>
  )}
</Card>
```
