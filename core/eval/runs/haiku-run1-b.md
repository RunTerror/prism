The $90 bill splits into $39.00 each for Ana and Ben, and $12.00 for Chris.

```prism
const total = 90
const chris = 12
const share = (total - chris) / 2
function money(n) { return "$" + n.toFixed(2) }

<Card title="Dinner split" subtitle="$90 total">
  <Stack gap="sm">
    <Row justify="between"><Text>Ana</Text><Text weight="bold">{money(share)}</Text></Row>
    <Row justify="between"><Text>Ben</Text><Text weight="bold">{money(share)}</Text></Row>
    <Row justify="between"><Text>Chris (salad)</Text><Text weight="bold">{money(chris)}</Text></Row>
    <Divider />
    <Row justify="between"><Text weight="bold">Total</Text><Text weight="bold">{money(total)}</Text></Row>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a habit tracker for the week with 3 habits and a tick box for each day.

```prism
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const [habits, setHabits] = useState([
  { name: "Exercise", days: [false, false, false, false, false, false, false] },
  { name: "Read", days: [false, false, false, false, false, false, false] },
  { name: "Drink water", days: [false, false, false, false, false, false, false] }
])
function toggle(hi, di, v) {
  return habits.map((h, i) => i === hi ? { ...h, days: h.days.map((d, j) => j === di ? v : d) } : h)
}

<Card title="This week" subtitle="Tick each day you did it">
  <Stack gap="md">
    {habits.map((h, hi) => (
      <Stack key={h.name} gap="xs">
        <Text weight="semibold">{h.name}</Text>
        <Row wrap gap="sm">
          {days.map((d, di) => (
            <Checkbox key={d} label={d} value={h.days[di]} onChange={v => setHabits(toggle(hi, di, v))} />
          ))}
        </Row>
      </Stack>
    ))}
  </Stack>
</Card>
```
=====ANSWER=====
Today's London weather is shown below, but the data had no hourly forecast for the next 3 hours, so that part is marked as missing.

```prism
<Card title="London today" subtitle="Cloudy">
  <Stack gap="md">
    <Grid columns={2} gap="sm">
      <Stat label="Temperature" value="18°C" />
      <Stat label="Humidity" value="60%" />
      <Stat label="Wind" value="12 km/h" />
      <Stat label="Condition" value="Cloudy" />
    </Grid>
    <Callout tone="info" title="Next 3 hours">Hourly forecast data was not given.</Callout>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a sign-up form, but the password is shown as plain text because the input cannot hide it.

```prism
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const filled = name.trim() !== "" && email.trim() !== "" && password !== ""
const strength = password.length >= 12 ? "Strong" : password.length >= 8 ? "Medium" : "Weak"
const hintTone = password.length >= 12 ? "success" : password.length >= 8 ? "warning" : "danger"

<Card title="Sign up" subtitle="All fields are required">
  <Stack gap="md">
    <Input label="Name" value={name} onChange={setName} placeholder="Ada Lovelace" />
    <Input label="Email" kind="email" value={email} onChange={setEmail} placeholder="you@example.com" />
    <Input label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" />
    {password.length > 0 && <Text size="sm" tone={hintTone}>{"Password strength: " + strength}</Text>}
    <Button disabled={!filled} onPress={() => P.toast("Account created")}>Sign up</Button>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a 5 minute countdown, but the app cannot run a live clock, so the time only goes down when you press the 10 second button.

```prism
const [left, setLeft] = useState(300)
const [running, setRunning] = useState(false)
const mins = Math.floor(left / 60)
const secs = left % 60
const clock = mins + ":" + (secs < 10 ? "0" : "") + secs

<Card title="Countdown" subtitle="5 minutes">
  <Stack gap="md" align="center">
    <Title size="xl">{clock}</Title>
    <Progress value={left / 300} />
    <Row justify="center">
      <Button icon={running ? "pause" : "play"} onPress={() => setRunning(!running)}>{running ? "Pause" : "Start"}</Button>
      <Button variant="outline" icon="refresh" onPress={() => { setLeft(300); setRunning(false) }}>Reset</Button>
    </Row>
    <Button variant="ghost" disabled={!running} onPress={() => setLeft(Math.max(0, left - 10))}>Take 10 seconds off</Button>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a pricing page with a yearly switch that changes the prices, but the prices are placeholders I made up because none were given.

```prism
const [yearly, setYearly] = useState(false)
const plans = [
  { name: "Free", monthly: 0, yearly: 0, perks: "1 project" },
  { name: "Pro", monthly: 10, yearly: 100, perks: "Unlimited projects" },
  { name: "Team", monthly: 25, yearly: 250, perks: "Unlimited projects and team seats" }
]

<Stack gap="md">
  <Row justify="center">
    <Switch label="Yearly billing" value={yearly} onChange={setYearly} />
  </Row>
  {plans.map(p => (
    <Card key={p.name} title={p.name} subtitle={p.perks}>
      <Title size="lg">{"$" + (yearly ? p.yearly : p.monthly)}</Title>
      <Text tone="muted">{yearly ? "per year" : "per month"}</Text>
      <Button variant={p.name === "Pro" ? "solid" : "outline"} onPress={() => P.toast("Chose " + p.name)}>{"Choose " + p.name}</Button>
    </Card>
  ))}
</Stack>
```
=====ANSWER=====
Here is a bar chart of your steps, drawn with progress bars because the app has no chart part.

```prism
const days = [4200, 8100, 6500, 10200, 7300, 3900, 9000]
const top = Math.max(...days)

<Card title="Steps" subtitle="Last 7 days">
  <Stack gap="md">
    {days.map((n, i) => (
      <Stack key={i} gap="xs">
        <Row justify="between">
          <Text>{"Day " + (i + 1)}</Text>
          <Text weight="bold">{n}</Text>
        </Row>
        <Progress value={n / top} />
      </Stack>
    ))}
  </Stack>
</Card>
```
=====ANSWER=====
Here is a headphones product card, but the app cannot show photos or half stars, so the photo is a placeholder and the rating shows 4 full stars and a fifth muted one with the number 4.5.

```prism
const [count, setCount] = useState(0)

<Card title="Wireless headphones" subtitle="Noise-cancelling over-ear">
  <Stack gap="sm">
    <Text tone="muted">[Photo of headphones]</Text>
    <Row gap="xs" align="center">
      <Icon name="star" tone="warning" />
      <Icon name="star" tone="warning" />
      <Icon name="star" tone="warning" />
      <Icon name="star" tone="warning" />
      <Icon name="star" tone="muted" />
      <Text size="sm" tone="muted">4.5 out of 5</Text>
    </Row>
    <Title size="lg">$129</Title>
    {count > 0 && <Badge tone="success">{"In cart: " + count}</Badge>}
    <Button icon="plus" onPress={() => { setCount(count + 1); P.toast("Added to cart") }}>Add to cart</Button>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a 3 step trip planner: pick a city, enter the dates, then confirm.

```prism
const [step, setStep] = useState(1)
const [destination, setDestination] = useState("")
const [start, setStart] = useState("")
const [end, setEnd] = useState("")
const canNext = step === 1 ? destination !== "" : step === 2 ? (start !== "" && end !== "") : true

<Card title="Plan your trip" subtitle={"Step " + step + " of 3"}>
  <Stack gap="md">
    {step === 1 && <Select label="Destination" value={destination} options={["Paris", "Tokyo", "New York", "Lisbon"]} placeholder="Choose a city" onChange={setDestination} />}
    {step === 2 && <Stack gap="md">
      <Input label="Start date" value={start} onChange={setStart} placeholder="YYYY-MM-DD" />
      <Input label="End date" value={end} onChange={setEnd} placeholder="YYYY-MM-DD" />
    </Stack>}
    {step === 3 && <Stack gap="sm">
      <Text>{"Destination: " + destination}</Text>
      <Text>{"From " + start + " to " + end}</Text>
    </Stack>}
    <Row justify="between">
      <Button variant="ghost" disabled={step === 1} onPress={() => setStep(step - 1)}>Back</Button>
      {step < 3
        ? <Button disabled={!canNext} onPress={() => setStep(step + 1)}>Next</Button>
        : <Button icon="check" onPress={() => P.toast("Trip confirmed")}>Confirm</Button>}
    </Row>
  </Stack>
</Card>
```
=====ANSWER=====
Here is a poll with 4 options that shows the results after you vote, using options I made up because none were given.

```prism
const options = ["Dark mode", "Offline sync", "Team chat", "Export to PDF"]
const [votes, setVotes] = useState([0, 0, 0, 0])
const [voted, setVoted] = useState(-1)
const total = votes.reduce((a, b) => a + b, 0)

<Card title="Which feature should we build next?" subtitle={total + " votes"}>
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
    <Stack gap="sm">
      {options.map((o, i) => (
        <Stack key={o} gap="xs">
          <Row justify="between">
            <Text weight={i === voted ? "bold" : "regular"}>{i === voted ? o + " (your vote)" : o}</Text>
            <Text tone="muted">{votes[i]}</Text>
          </Row>
          <Progress value={total ? votes[i] / total : 0} />
        </Stack>
      ))}
    </Stack>
  )}
</Card>
```
