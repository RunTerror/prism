Ana and Ben each pay $39, and Chris pays his $12 salad.

```prism
const total = 90
const chrisSalad = 12
const share = (total - chrisSalad) / 2

<Card title="Dinner split" subtitle="$90 total">
  <Row justify="between">
    <Text>Ana</Text>
    <Text weight="bold">{"$" + share}</Text>
  </Row>
  <Row justify="between">
    <Text>Ben</Text>
    <Text weight="bold">{"$" + share}</Text>
  </Row>
  <Row justify="between">
    <Text>Chris (salad)</Text>
    <Text weight="bold">{"$" + chrisSalad}</Text>
  </Row>
  <Divider />
  <Row justify="between">
    <Text weight="bold">Total</Text>
    <Text weight="bold">{"$" + total}</Text>
  </Row>
</Card>
```
=====ANSWER=====
A habit tracker with three habits and a checkbox for each day of the week.

```prism
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const empty = [false, false, false, false, false, false, false]
const [habits, setHabits] = useState([
  { id: 1, name: "Exercise", done: empty },
  { id: 2, name: "Read", done: empty },
  { id: 3, name: "Drink water", done: empty }
])

<Stack gap="md">
  {habits.map(h => (
    <Card key={h.id} title={h.name} subtitle={h.done.filter(Boolean).length + " of 7 days"}>
      <Row wrap gap="sm">
        {days.map((d, i) => (
          <Checkbox key={d} label={d} value={h.done[i]}
            onChange={v => setHabits(habits.map(x => x.id === h.id ? { ...x, done: x.done.map((y, k) => k === i ? v : y) } : x))} />
        ))}
      </Row>
    </Card>
  ))}
</Stack>
```
=====ANSWER=====
Here is today's London weather; the screen tools have no hourly forecast, so the next 3 hours show "No forecast given."

```prism
const hours = ["+1 h", "+2 h", "+3 h"]

<Card title="London" subtitle="Today">
  <Row justify="between">
    <Title size="xl">18°C</Title>
    <Icon name="cloud" size="lg" tone="muted" />
  </Row>
  <Text>Cloudy</Text>
  <Grid columns={2}>
    <Stat label="Humidity" value="60%" />
    <Stat label="Wind" value="12 km/h" />
  </Grid>
  <Divider />
  <Title size="sm">Next 3 hours</Title>
  {hours.map(h => (
    <Row key={h} justify="between">
      <Text>{h}</Text>
      <Text tone="muted">No forecast given</Text>
    </Row>
  ))}
</Card>
```
=====ANSWER=====
A sign-up form that enables the button only when all fields are filled, with a password strength hint; the password shows as plain text because these screens have no hidden-text field.

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const strength = password.length >= 10 ? "Strong" : password.length >= 6 ? "Medium" : "Weak"
const hintTone = password.length >= 10 ? "success" : password.length >= 6 ? "warning" : "danger"
const filled = name.trim() !== "" && email.trim() !== "" && password !== ""

<Card title="Sign up">
  <Input label="Name" value={name} onChange={setName} placeholder="Ada" />
  <Input label="Email" kind="email" value={email} onChange={setEmail} placeholder="you@example.com" />
  <Input label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
  {password !== "" && <Text tone={hintTone} size="sm">{"Password strength: " + strength}</Text>}
  <Button disabled={!filled} onPress={() => P.toast("Account created")}>Sign up</Button>
</Card>
```
=====ANSWER=====
Screens cannot use timers, so each tap on Tick removes one second while the countdown is running.

```prism
const [seconds, setSeconds] = useState(300)
const [running, setRunning] = useState(false)
function fmt(n) { return String(n).padStart(2, "0") }
const shown = fmt(Math.floor(seconds / 60)) + ":" + fmt(seconds % 60)

<Card title="Countdown" subtitle="5 minutes">
  <Title size="xl" align="center">{shown}</Title>
  <Row justify="center">
    <Button onPress={() => setRunning(!running)}>{running ? "Pause" : "Start"}</Button>
    <Button variant="outline" onPress={() => { setSeconds(300); setRunning(false) }}>Reset</Button>
  </Row>
  <Button variant="ghost" disabled={!running || seconds === 0} onPress={() => setSeconds(seconds - 1)}>Tick one second</Button>
</Card>
```
=====ANSWER=====
Free, Pro and Team plans with a yearly switch; I used example prices because none were given.

```prism
const [yearly, setYearly] = useState(false)
const plans = [
  { name: "Free", monthly: 0, yearly: 0 },
  { name: "Pro", monthly: 12, yearly: 120 },
  { name: "Team", monthly: 30, yearly: 300 }
]
function priceOf(p) { return yearly ? p.yearly : p.monthly }

<Stack gap="md">
  <Switch label="Yearly billing" value={yearly} onChange={setYearly} />
  {plans.map(p => (
    <Card key={p.name} title={p.name}>
      <Title size="lg">{"$" + priceOf(p)}</Title>
      <Text tone="muted">{yearly ? "per year" : "per month"}</Text>
    </Card>
  ))}
</Stack>
```
=====ANSWER=====
There is no bar chart part, so each of the 7 days is shown as a progress bar scaled to the highest day.

```prism
const steps = [4200, 8100, 6500, 10200, 7300, 3900, 9000]
const top = Math.max(...steps)

<Card title="Steps, last 7 days">
  {steps.map((s, i) => (
    <Progress key={i} label={"Day " + (i + 1) + ": " + s} value={s / top} />
  ))}
</Card>
```
=====ANSWER=====
The screen tools have no photo or half-star, so this card shows four full stars and one empty star for the 4.5 rating.

```prism
const [inCart, setInCart] = useState(false)

<Card title="Headphones">
  <Row justify="between">
    <Title size="lg">$129</Title>
  </Row>
  <Row gap="xs">
    <Icon name="star" tone="warning" />
    <Icon name="star" tone="warning" />
    <Icon name="star" tone="warning" />
    <Icon name="star" tone="warning" />
    <Icon name="star" tone="muted" />
    <Text size="sm">4.5 out of 5</Text>
  </Row>
  <Button icon="plus" disabled={inCart} onPress={() => setInCart(true)}>{inCart ? "Added to cart" : "Add to cart"}</Button>
</Card>
```
=====ANSWER=====
A three-step trip wizard with Back and Next buttons, ending in a Confirm button.

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [startDate, setStartDate] = useState("")
const [endDate, setEndDate] = useState("")
function canNext() {
  if (step === 1) return destination.trim() !== ""
  if (step === 2) return startDate !== "" && endDate !== ""
  return true
}

<Card title="Plan your trip" subtitle={"Step " + step + " of 3"}>
  <Progress value={step / 3} />
  {step === 1 && (
    <Input label="Destination" value={destination} onChange={setDestination} placeholder="Where to?" />
  )}
  {step === 2 && (
    <Stack gap="sm">
      <Input label="Start date" value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" />
      <Input label="End date" value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" />
    </Stack>
  )}
  {step === 3 && (
    <Stack gap="sm">
      <Text>{"Destination: " + destination}</Text>
      <Text>{"Dates: " + startDate + " to " + endDate}</Text>
    </Stack>
  )}
  <Row justify="between">
    <Button variant="outline" disabled={step === 1} onPress={() => setStep(step - 1)}>Back</Button>
    {step < 3 && <Button disabled={!canNext()} onPress={() => setStep(step + 1)}>Next</Button>}
    {step === 3 && <Button onPress={() => P.toast("Trip confirmed")}>Confirm</Button>}
  </Row>
</Card>
```
=====ANSWER=====
A poll with four placeholder options, since none were given, that shows the results after one vote.

```prism
const choices = ["Dark mode", "Offline mode", "Widgets", "Export"]
const [votes, setVotes] = useState([0, 0, 0, 0])
const [voted, setVoted] = useState(false)
const total = votes.reduce((a, b) => a + b, 0)

<Card title="Which feature should we build next?">
  {voted ? (
    <Stack gap="sm">
      {choices.map((c, i) => (
        <Progress key={c} label={c + ": " + votes[i]} value={total > 0 ? votes[i] / total : 0} />
      ))}
    </Stack>
  ) : (
    <Stack gap="sm">
      {choices.map((c, i) => (
        <Button key={c} variant="outline" onPress={() => {
          setVotes(votes.map((v, k) => k === i ? v + 1 : v))
          setVoted(true)
        }}>{c}</Button>
      ))}
    </Stack>
  )}
</Card>
```
