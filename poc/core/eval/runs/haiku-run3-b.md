Here is a tip calculator. Change the bill, tip and number of people to see each person's share.

```prism
const [bill, setBill] = useState(50)
const [tip, setTip] = useState(15)
const [people, setPeople] = useState(2)
const b = bill || 0
const total = b + b * tip / 100
const each = people > 0 ? total / people : 0

<Card title="Tip calculator">
  <Stack gap="md">
    <Input label="Bill" kind="number" value={bill} onChange={setBill} />
    <Slider label={"Tip: " + tip + "%"} value={tip} min={0} max={30} step={1} onChange={setTip} />
    <Slider label={"People: " + people} value={people} min={1} max={20} step={1} onChange={setPeople} />
    <Stat label="Each person pays" value={"$" + each.toFixed(2)} />
    <Text tone="muted" size="sm">{"Total with tip: $" + total.toFixed(2)}</Text>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a comparison of the three plans. Tap one to pick it, then confirm.

```prism
const [choice, setChoice] = useState("")
const plans = [
  { name: "Basic", price: 10, data: "5 GB" },
  { name: "Plus", price: 20, data: "20 GB" },
  { name: "Max", price: 35, data: "Unlimited" }
]

<Card title="Choose a phone plan" subtitle={choice === "" ? "Pick one below" : "You picked " + choice}>
  <Table>
    <TableRow>
      <Cell header>Plan</Cell>
      <Cell header align="end">Price</Cell>
      <Cell header align="end">Data</Cell>
    </TableRow>
    {plans.map(p => (
      <TableRow key={p.name}>
        <Cell>{p.name}</Cell>
        <Cell align="end">{"$" + p.price + "/mo"}</Cell>
        <Cell align="end">{p.data}</Cell>
      </TableRow>
    ))}
  </Table>
  <Row wrap>
    {plans.map(p => (
      <Button key={p.name} variant={choice === p.name ? "solid" : "outline"} onPress={() => setChoice(p.name)}>{p.name}</Button>
    ))}
  </Row>
  {choice !== "" && <Button icon="check" onPress={() => P.toast("Plan " + choice + " chosen")}>Confirm {choice}</Button>}
</Card>
```
=====ANSWER=====
Here is a simple workout tracker. Add exercises and tick them off as you go.

```prism
const [exercises, setExercises] = useState([{ id: 1, name: "Push-ups", done: false }])
const [draft, setDraft] = useState("")
const doneCount = exercises.filter(e => e.done).length

<Card title="Workout" subtitle={doneCount + " of " + exercises.length + " done"}>
  <Progress value={exercises.length > 0 ? doneCount / exercises.length : 0} label="Progress" />
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
</Card>
```
=====ANSWER=====
Here is your monthly budget. You have $550 left after your spending.

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

<Card title="Monthly budget" subtitle={"Income $" + income}>
  <Stat label="Left to spend" value={"$" + left} tone={left < 0 ? "danger" : "success"} />
  <Progress value={spent / income} label={"Spent $" + spent + " of $" + income} />
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
Here is a settings screen for notifications.

```prism
const [notify, setNotify] = useState(true)
const [volume, setVolume] = useState(60)
const [quiet, setQuiet] = useState(false)

<Card title="Notifications">
  <Stack gap="lg">
    <Switch label="Notifications" value={notify} onChange={setNotify} />
    <Slider label={"Volume: " + volume} value={volume} min={0} max={100} step={5} onChange={setVolume} />
    <Switch label="Quiet hours" value={quiet} onChange={setQuiet} />
  </Stack>
</Card>
```
=====ANSWER=====
Here is a converter. Type in either box and the other one updates.

```prism
const [km, setKm] = useState(10)
const [mi, setMi] = useState(6.21)

<Card title="Kilometres and miles" subtitle="Type in either box">
  <Stack gap="md">
    <Input label="Kilometres" kind="number" value={km}
      onChange={v => { setKm(v); setMi(v === null ? null : Math.round(v * 0.621371 * 100) / 100) }} />
    <Input label="Miles" kind="number" value={mi}
      onChange={v => { setMi(v); setKm(v === null ? null : Math.round(v / 0.621371 * 100) / 100) }} />
  </Stack>
</Card>
```
=====ANSWER=====
Here is a BMI calculator. Type your height and weight to see your category.

```prism
const [cm, setCm] = useState(170)
const [kg, setKg] = useState(70)
const h = (cm || 0) / 100
const bmi = h > 0 ? (kg || 0) / (h * h) : 0
const rounded = Math.round(bmi * 10) / 10
const category = bmi === 0 ? "Enter your height and weight" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy weight" : bmi < 30 ? "Overweight" : "Obese"
const statusTone = bmi === 0 ? "neutral" : category === "Healthy weight" ? "success" : "warning"

<Card title="BMI calculator">
  <Stack gap="md">
    <Input label="Height (cm)" kind="number" value={cm} onChange={setCm} />
    <Input label="Weight (kg)" kind="number" value={kg} onChange={setKg} />
    <Stat label="Your BMI" value={bmi === 0 ? "-" : String(rounded)} delta={category} tone={statusTone} />
  </Stack>
</Card>
```
=====ANSWER=====
Here is a shopping list. Add items with a quantity, and tick them off when bought.

```prism
const [items, setItems] = useState([{ id: 1, name: "Milk", qty: 2, bought: false }])
const [name, setName] = useState("")
const [qty, setQty] = useState(1)
const left = items.filter(i => !i.bought).length

<Card title="Shopping list">
  <Stat label="Left to buy" value={String(left)} />
  {items.map(i => (
    <Checkbox key={i.id} label={i.name + " x " + i.qty} value={i.bought}
      onChange={v => setItems(items.map(x => x.id === i.id ? { ...x, bought: v } : x))} />
  ))}
  <Row>
    <Input value={name} onChange={setName} placeholder="Item" />
    <Input kind="number" value={qty} onChange={setQty} placeholder="Qty" />
    <Button icon="plus" disabled={!name.trim()} onPress={() => {
      setItems([...items, { id: Date.now(), name: name.trim(), qty: qty || 1, bought: false }])
      setName("")
      setQty(1)
    }}>Add</Button>
  </Row>
</Card>
```
=====ANSWER=====
Here is a 3-question quiz about the solar system.

```prism
const questions = [
  { q: "How many planets are in the solar system?", options: ["7", "8", "9"], answer: "8" },
  { q: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Mars"], answer: "Mercury" },
  { q: "Which is the largest planet?", options: ["Saturn", "Jupiter", "Neptune"], answer: "Jupiter" }
]
const [step, setStep] = useState(0)
const [score, setScore] = useState(0)
const finished = step >= questions.length

{!finished && (
  <Card title={"Question " + (step + 1) + " of 3"} subtitle={questions[step].q}>
    <Stack gap="sm">
      {questions[step].options.map(o => (
        <Button key={o} variant="outline" onPress={() => {
          if (o === questions[step].answer) setScore(score + 1)
          setStep(step + 1)
        }}>{o}</Button>
      ))}
    </Stack>
  </Card>
)}
{finished && (
  <Card title="Quiz done">
    <Stat label="Your score" value={score + " of 3"} tone={score === 3 ? "success" : "neutral"} />
    <Button icon="refresh" onPress={() => { setStep(0); setScore(0) }}>Try again</Button>
  </Card>
)}
```
=====ANSWER=====
Here is the pancake recipe. Change the servings and the amounts update.

```prism
const [servings, setServings] = useState(4)
const k = servings / 4
function fmt(n) { return Math.round(n * 10) / 10 }
const ingredients = [
  { name: "Flour", amount: 1, unit: "cup" },
  { name: "Milk", amount: 1, unit: "cup" },
  { name: "Eggs", amount: 1, unit: "" },
  { name: "Sugar", amount: 2, unit: "tbsp" },
  { name: "Baking powder", amount: 1, unit: "tsp" }
]

<Card title="Pancakes" subtitle="Recipe for 4 people">
  <Row justify="between">
    <Text weight="semibold">{servings + " servings"}</Text>
    <Row>
      <Button variant="outline" icon="minus" label="Fewer servings" disabled={servings <= 1} onPress={() => setServings(servings - 1)} />
      <Button variant="outline" icon="plus" label="More servings" onPress={() => setServings(servings + 1)} />
    </Row>
  </Row>
  <Table>
    {ingredients.map(i => (
      <TableRow key={i.name}>
        <Cell>{i.name}</Cell>
        <Cell align="end">{fmt(i.amount * k) + " " + i.unit}</Cell>
      </TableRow>
    ))}
  </Table>
</Card>
```
=====ANSWER=====
Here is the bill split. Chris pays his salad on top of his share.

```prism
const [total, setTotal] = useState(90)
const [salad, setSalad] = useState(12)
const shared = ((total || 0) - (salad || 0)) / 3
const people = [
  { name: "Ana", pays: shared },
  { name: "Ben", pays: shared },
  { name: "Chris", pays: shared + (salad || 0) }
]

<Card title="Split the dinner bill" subtitle="The rest is shared equally">
  <Input label="Bill total" kind="number" value={total} onChange={setTotal} />
  <Input label="Chris's salad" kind="number" value={salad} onChange={setSalad} />
  <Table>
    {people.map(p => (
      <TableRow key={p.name}>
        <Cell>{p.name}</Cell>
        <Cell align="end">{"$" + p.pays.toFixed(2)}</Cell>
      </TableRow>
    ))}
  </Table>
</Card>
```
=====ANSWER=====
Here is a habit tracker for this week. Tick each day you did the habit.

```prism
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const [habits, setHabits] = useState([
  { id: 1, name: "Water", checks: [false, false, false, false, false, false, false] },
  { id: 2, name: "Walk", checks: [false, false, false, false, false, false, false] },
  { id: 3, name: "Read", checks: [false, false, false, false, false, false, false] }
])

<Card title="This week" subtitle="Tick each day you did it">
  <Stack gap="lg">
    {habits.map(h => (
      <Stack key={h.id} gap="sm">
        <Text weight="semibold">{h.name + " - " + h.checks.filter(Boolean).length + " of 7"}</Text>
        <Row wrap gap="sm">
          {days.map((d, i) => (
            <Checkbox key={d} label={d} value={h.checks[i]}
              onChange={v => setHabits(habits.map(x => x.id === h.id ? { ...x, checks: x.checks.map((c, j) => j === i ? v : c) } : x))} />
          ))}
        </Row>
      </Stack>
    ))}
  </Stack>
</Card>
```
=====ANSWER=====
Here is today's weather in London. The hourly forecast values were not given, so those cells show a dash.

```prism
<Card title="London" subtitle="Now">
  <Row justify="between">
    <Title size="xl">18°C</Title>
    <Icon name="cloud" size="lg" label="Cloudy" />
  </Row>
  <Text tone="muted">Cloudy</Text>
  <Grid columns={2}>
    <Stat label="Humidity" value="60%" />
    <Stat label="Wind" value="12 km/h" />
  </Grid>
  <Divider />
  <Text weight="semibold">Next 3 hours</Text>
  <Table>
    <TableRow>
      <Cell header>Time</Cell>
      <Cell header align="end">Temperature</Cell>
    </TableRow>
    <TableRow>
      <Cell>In 1 hour</Cell>
      <Cell align="end">--</Cell>
    </TableRow>
    <TableRow>
      <Cell>In 2 hours</Cell>
      <Cell align="end">--</Cell>
    </TableRow>
    <TableRow>
      <Cell>In 3 hours</Cell>
      <Cell align="end">--</Cell>
    </TableRow>
  </Table>
</Card>
```
=====ANSWER=====
Here is a sign-up form. The submit button turns on once all three fields are filled in.

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const filled = name.trim() !== "" && email.trim() !== "" && password !== ""
const strength = password.length === 0 ? "" : password.length < 6 ? "Weak" : password.length < 10 ? "Fair" : "Strong"
const strengthTone = strength === "Strong" ? "success" : strength === "Fair" ? "warning" : "danger"

<Card title="Sign up">
  <Stack gap="md">
    <Input label="Name" value={name} onChange={setName} placeholder="Ada" />
    <Input label="Email" kind="email" value={email} onChange={setEmail} placeholder="you@example.com" />
    <Input label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
    {strength !== "" && <Text size="sm" textTone={strengthTone}>{"Password strength: " + strength}</Text>}
    <Button disabled={!filled} onPress={() => P.toast("Account created for " + name)}>Sign up</Button>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a 5-minute countdown with Start and Reset. This screen cannot tick down by itself, so Start only switches the button to Pause and the clock stays at 5:00 until a timer is added.

```prism
const total = 300
const [left, setLeft] = useState(300)
const [running, setRunning] = useState(false)
const mins = Math.floor(left / 60)
const secs = left % 60
const clock = mins + ":" + (secs < 10 ? "0" + secs : String(secs))

<Card title="Countdown" subtitle="5 minutes">
  <Stack gap="lg">
    <Title size="xl" align="center">{clock}</Title>
    <Progress value={left / total} label="Time left" />
    <Row justify="center">
      <Button icon={running ? "pause" : "play"} onPress={() => setRunning(!running)}>{running ? "Pause" : "Start"}</Button>
      <Button variant="outline" icon="refresh" onPress={() => { setLeft(total); setRunning(false) }}>Reset</Button>
    </Row>
  </Stack>
</Card>
```
=====ANSWER=====
Here is the pricing page. Turn on yearly billing to see the yearly prices.

```prism
const [yearly, setYearly] = useState(false)
const plans = [
  { name: "Free", monthly: 0, yearly: 0, perks: "1 project" },
  { name: "Pro", monthly: 10, yearly: 100, perks: "Unlimited projects" },
  { name: "Team", monthly: 25, yearly: 250, perks: "Unlimited projects and team seats" }
]

<Stack gap="md">
  <Switch label="Yearly billing (2 months free)" value={yearly} onChange={setYearly} />
  {plans.map(p => (
    <Card key={p.name} title={p.name} subtitle={p.perks}>
      <Row justify="between">
        <Title size="lg">{"$" + (yearly ? p.yearly : p.monthly)}</Title>
        <Text tone="muted">{p.monthly === 0 ? "" : yearly ? "per year" : "per month"}</Text>
      </Row>
      <Button variant={p.name === "Pro" ? "solid" : "outline"} onPress={() => P.toast("Chose " + p.name)}>{"Choose " + p.name}</Button>
    </Card>
  ))}
</Stack>
```
=====ANSWER=====
Here is your steps chart for the last 7 days.

```prism
const steps = [4200, 8100, 6500, 10200, 7300, 3900, 9000]
const total = steps.reduce((a, b) => a + b, 0)
const avg = Math.round(total / steps.length)

<Card title="Steps, last 7 days">
  <Stat label="Daily average" value={String(avg)} />
  <Chart kind="bar" data={steps} labels={["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"]} label="Steps per day for the last 7 days" height="lg" />
</Card>
```
=====ANSWER=====
Here is the headphones product card.

```prism
const [inCart, setInCart] = useState(0)

<Card title="Over-ear headphones" subtitle="Black, wireless">
  <Image src="headphones" alt="Black over-ear headphones on a yellow background" ratio="square" />
  <Row justify="between">
    <Title size="lg">$129</Title>
    <Row gap="xs">
      <Icon name="star" tone="warning" />
      <Text weight="semibold">4.5</Text>
      <Text tone="muted">out of 5</Text>
    </Row>
  </Row>
  <Button icon="plus" onPress={() => setInCart(inCart + 1)}>Add to cart</Button>
  {inCart > 0 && <Text tone="muted" textAlign="center">{inCart + " in cart"}</Text>}
</Card>
```
=====ANSWER=====
Here is a 3-step trip planner. Enter a destination, then the dates, then confirm.

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [start, setStart] = useState("")
const [end, setEnd] = useState("")
const canNext1 = destination.trim() !== ""
const canNext2 = start !== "" && end !== ""

<Card title={"Step " + step + " of 3"} subtitle={step === 1 ? "Where to?" : step === 2 ? "When?" : "Check your trip"}>
  <Progress value={step / 3} />
  {step === 1 && (
    <Input label="Destination" value={destination} onChange={setDestination} placeholder="e.g. Lisbon" />
  )}
  {step === 2 && (
    <Stack gap="md">
      <Input label="Start date" value={start} onChange={setStart} placeholder="YYYY-MM-DD" />
      <Input label="End date" value={end} onChange={setEnd} placeholder="YYYY-MM-DD" />
    </Stack>
  )}
  {step === 3 && (
    <Stack gap="sm">
      <Text>{"Destination: " + destination}</Text>
      <Text>{"Dates: " + start + " to " + end}</Text>
    </Stack>
  )}
  <Row justify="between">
    <Button variant="ghost" disabled={step === 1} onPress={() => setStep(step - 1)}>Back</Button>
    {step < 3 && <Button disabled={step === 1 ? !canNext1 : !canNext2} onPress={() => setStep(step + 1)}>Next</Button>}
    {step === 3 && <Button icon="check" onPress={() => P.toast("Trip to " + destination + " confirmed")}>Confirm</Button>}
  </Row>
</Card>
```
=====ANSWER=====
Here is the feature poll. The results show after you vote.

```prism
const options = ["Dark mode", "Offline mode", "Export to PDF", "Team sharing"]
const [votes, setVotes] = useState([0, 0, 0, 0])
const [voted, setVoted] = useState(-1)
const total = votes.reduce((a, b) => a + b, 0)

<Card title="Which feature should we build next?" subtitle={voted < 0 ? "Pick one" : "Thanks for voting"}>
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
        <Progress key={o} value={total > 0 ? votes[i] / total : 0} label={o + " - " + votes[i] + " votes"} tone={i === voted ? "primary" : "neutral"} />
      ))}
    </Stack>
  )}
</Card>
```