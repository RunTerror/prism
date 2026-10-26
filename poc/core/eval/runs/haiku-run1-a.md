Here is a tip calculator that splits a restaurant bill between people.

```prism
const [bill, setBill] = useState(60)
const [tip, setTip] = useState(15)
const [people, setPeople] = useState(2)
const n = people && people > 0 ? people : 1
const tipAmt = (bill || 0) * tip / 100
const total = (bill || 0) + tipAmt
const each = total / n

<Card title="Tip calculator">
  <Input label="Bill" kind="number" value={bill} onChange={setBill} />
  <Slider label="Tip %" value={tip} min={0} max={30} step={1} onChange={setTip} />
  <Input label="People" kind="number" value={people} onChange={setPeople} />
  <Divider />
  <Stat label="Tip" value={"$" + tipAmt.toFixed(2)} />
  <Stat label="Each person pays" value={"$" + each.toFixed(2)} tone="success" />
</Card>
```

=====ANSWER=====

Here is a side-by-side style comparison of the three phone plans, where you can pick one.

```prism
const [plan, setPlan] = useState("")
const plans = [
  { id: "basic", name: "Basic", price: 10, data: "5 GB" },
  { id: "plus", name: "Plus", price: 20, data: "20 GB" },
  { id: "max", name: "Max", price: 35, data: "Unlimited" }
]
const chosen = plans.find(p => p.id === plan)

<Stack gap="md">
  {plans.map(p => (
    <Card key={p.id} title={p.name} subtitle={p.data + " of data"}>
      <Row justify="between">
        <Text size="lg" weight="bold">{"$" + p.price + " a month"}</Text>
        <Button variant={plan === p.id ? "solid" : "outline"} onPress={() => setPlan(p.id)}>{plan === p.id ? "Chosen" : "Choose"}</Button>
      </Row>
    </Card>
  ))}
  {chosen && <Callout tone="success" title="Your plan">{chosen.name + " at $" + chosen.price + " a month, with " + chosen.data + " of data."}</Callout>}
</Stack>
```

=====ANSWER=====

Here is a workout tracker where you can add exercises and tick them off.

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
</Card>
```

=====ANSWER=====

Here is your monthly budget, with each category shown against your income.

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
  {items.map(i => (
    <Progress key={i.name} label={i.name + " · $" + i.amount} value={i.amount / income} />
  ))}
  <Divider />
  <Grid columns={2}>
    <Stat label="Spent" value={"$" + spent} />
    <Stat label="Left" value={"$" + left} tone={left < 0 ? "danger" : "success"} />
  </Grid>
</Card>
```

=====ANSWER=====

Here is a notifications settings screen with a volume slider and a quiet hours switch.

```prism
const [notifications, setNotifications] = useState(true)
const [volume, setVolume] = useState(50)
const [quiet, setQuiet] = useState(false)

<Card title="Notifications">
  <Switch label="Notifications" value={notifications} onChange={setNotifications} />
  <Slider label="Volume" value={volume} min={0} max={100} step={1} onChange={setVolume} />
  <Switch label="Quiet hours" value={quiet} onChange={setQuiet} />
  {quiet && <Text tone="muted" size="sm">Alerts are silenced during quiet hours.</Text>}
</Card>
```

=====ANSWER=====

Here is a converter where you can type in either kilometres or miles and the other one updates.

```prism
const [km, setKm] = useState(10)
const [miles, setMiles] = useState(6.21)

<Card title="Kilometres and miles">
  <Input label="Kilometres" kind="number" value={km} onChange={v => { setKm(v); setMiles(v == null ? null : +(v * 0.621371).toFixed(2)) }} />
  <Input label="Miles" kind="number" value={miles} onChange={v => { setMiles(v); setKm(v == null ? null : +(v * 1.609344).toFixed(2)) }} />
</Card>
```

=====ANSWER=====

Here is a BMI calculator that shows your number and its category.

```prism
const [height, setHeight] = useState(170)
const [weight, setWeight] = useState(70)
const m = (height || 0) / 100
const bmi = m > 0 ? (weight || 0) / (m * m) : 0
const category = bmi <= 0 ? "Enter your numbers" : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy weight" : bmi < 30 ? "Overweight" : "Obese"
const level = bmi <= 0 ? "neutral" : bmi < 18.5 ? "warning" : bmi < 25 ? "success" : bmi < 30 ? "warning" : "danger"

<Card title="BMI calculator">
  <Input label="Height (cm)" kind="number" value={height} onChange={setHeight} />
  <Input label="Weight (kg)" kind="number" value={weight} onChange={setWeight} />
  <Divider />
  <Stat label="BMI" value={bmi > 0 ? bmi.toFixed(1) : "-"} />
  <Badge tone={level}>{category}</Badge>
</Card>
```

=====ANSWER=====

Here is a shopping list where you can add items with a quantity and see how many are left to buy.

```prism
const [items, setItems] = useState([{ id: 1, name: "Milk", qty: 2, bought: false }])
const [name, setName] = useState("")
const [qty, setQty] = useState(1)
const toBuy = items.filter(i => !i.bought).length

<Card title="Shopping list" subtitle={toBuy + " left to buy"}>
  {items.map(i => (
    <Checkbox key={i.id} label={i.name + " x" + i.qty} value={i.bought}
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

Here is a three-question quiz about the solar system that shows your score at the end.

```prism
const [step, setStep] = useState(0)
const [score, setScore] = useState(0)
const questions = [
  { q: "Which planet is closest to the Sun?", options: ["Venus", "Mercury", "Mars"], answer: 1 },
  { q: "What is the largest planet?", options: ["Saturn", "Neptune", "Jupiter"], answer: 2 },
  { q: "What is at the centre of the solar system?", options: ["The Moon", "The Sun", "Earth"], answer: 1 }
]
const finished = step >= questions.length
const current = questions[step]

<Card title="Solar system quiz" subtitle={finished ? "Finished" : "Question " + (step + 1) + " of 3"}>
  {finished ? (
    <Stack gap="md">
      <Title size="xl">{score + " / " + questions.length}</Title>
      <Text>{score === questions.length ? "Perfect score!" : "Thanks for playing."}</Text>
      <Button variant="outline" icon="refresh" onPress={() => { setStep(0); setScore(0) }}>Play again</Button>
    </Stack>
  ) : (
    <Stack gap="md">
      <Title size="sm">{current.q}</Title>
      {current.options.map((o, i) => (
        <Button key={o} variant="outline" onPress={() => {
          setScore(i === current.answer ? score + 1 : score)
          setStep(step + 1)
        }}>{o}</Button>
      ))}
    </Stack>
  )}
</Card>
```

=====ANSWER=====

Here is a pancake recipe where you can change the servings and the ingredients scale to match.

```prism
const [servings, setServings] = useState(4)
const base = 4
const factor = servings / base
const ingredients = [
  { name: "Flour", amount: 1, unit: "cup" },
  { name: "Milk", amount: 1.25, unit: "cups" },
  { name: "Eggs", amount: 2, unit: "" },
  { name: "Sugar", amount: 2, unit: "tbsp" },
  { name: "Melted butter", amount: 2, unit: "tbsp" }
]
const fmt = n => String(Math.round(n * 100) / 100)

<Card title="Pancakes" subtitle={"Serves " + servings}>
  <Row justify="between">
    <Button variant="outline" icon="minus" label="Fewer servings" disabled={servings <= 1} onPress={() => setServings(servings - 1)} />
    <Text size="lg" weight="bold">{servings + " servings"}</Text>
    <Button variant="outline" icon="plus" label="More servings" onPress={() => setServings(servings + 1)} />
  </Row>
  <Divider />
  {ingredients.map(i => (
    <Row key={i.name} justify="between">
      <Text>{i.name}</Text>
      <Text weight="bold">{fmt(i.amount * factor) + " " + i.unit}</Text>
    </Row>
  ))}
</Card>
```
