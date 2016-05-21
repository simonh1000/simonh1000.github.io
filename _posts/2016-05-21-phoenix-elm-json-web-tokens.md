---
title: Phoenix & Elm - authentication with Json Web Tokens
layout: post
tags: Elm, Elixir
---

Json Web Tokens ([Jwts](https://jwt.io/introduction/)) are a rich alternative to cookies for ensuring authenticated access to protected assets, and it is now easy to implement them in a Phoenix-Elm (i.e. single page) environment using the [Guardian](https://github.com/ueberauth/guardian) and (my own) [Elm-Jwt](http://package.elm-lang.org/packages/simonh1000/elm-jwt/latest) libraries respectively. This blog accompanies the example code in my [Github repo](https://github.com/simonh1000/elm-jwt/), and steals gratefully from Daniel Neighman's post on [Guardian for APIs](http://blog.overstuffedgorilla.com/simple-guardian-api-authentication/).

## Setting up

On the Phoenix side you will need to add a module for handling passwords - [comeonin](https://github.com/elixircnx/comeonin) seems to be the obvious choice - and Guardian.

{% highlight elixir %}
defp deps do
  [{:phoenix, "~> 1.1.4"},
   ...,
   {:comeonin, "~> 2.4"},
   {:guardian, "~> 0.10.0"}]
end
{% endhighlight %}

The Elm package manager is your friend on the client side - just `elm package install -y simonh1000/elm-jwt`.

Guardian needs some configuration

{% highlight elixir %}
config :guardian, Guardian,
  allowed_algos: ["ES512"],
  secret_key: "my little secret",

  issuer: "JwtExample",
  ttl: { 30, :days },
  serializer: JwtExample.GuardianSerializer
{% endhighlight %}

## Issuing tokens

I won't cover registering users here, but once they existing in the system they will need to login in via a route we shall call `sessions`. (`mix phoenix.gen.json Session sessions`)

{% highlight elixir %}
pipeline :api do
  plug :accepts, ["json"]
  plug :fetch_session
  plug :fetch_flash
end

scope "/sessions", JwtExample do
    pipe_through :api
    post "/", SessionController, :create
end
{% endhighlight %}

The client will be sending credentials via a POST request, and our controller (below) will prepare the token to return.

{% highlight elixir %}
def create(conn, %{"username" => username, "password" => password}) do
    case Auth.login_by_username_and_pass(conn, username, password, repo: Repo) do
        {:ok, conn} ->
            new_conn = Guardian.Plug.api_sign_in(conn, conn.assigns[:current_user])
            jwt = Guardian.Plug.current_token(new_conn)
            {:ok, claims} = Guardian.Plug.claims(new_conn)
            exp = Map.get(claims, "exp")

            new_conn
            |> put_resp_header("authorization", "Bearer #{jwt}")
            |> put_resp_header("x-expires", "#{exp}")
            |> render("login.json", jwt: jwt)
        {:error, reason, conn} ->
            conn
            |> put_status(500)
            |> render("error")
    end
end
{% endhighlight %}

`Auth.login_by_username_and_pass` checks the credentials and, if the password is validated, assigns the user details to `:current_user`. `Guardian.Plug.api_sign_in` uses that information to construct the token with the help of my custom serializer.

{% highlight elixir %}
def for_token(user = %User{}), do: { :ok, "User:#{user.id}" }
def from_token("User:" <> id), do: { :ok, Repo.get(User, id) }
{% endhighlight %}

Guardian takes the output of the `for_token` serializer and adds it as the "username" in the body of the token. The full token is eventually sent to the client by rendering in the view as a Json object `{"token" : token}`.

Turning to the client, a simple form collects a username and password and sends them to the server as part of the update function, and with the help of elm-jwt's `authenticate` function. Using the new 0.17 syntax, this reads as:

{% highlight haskell %}
Submit ->
    let credentials =
        E.object
            [ ("username", E.string model.uname)
            , ("password", E.string model.pword)
            ]
        |> E.encode 0
    in
    ( model
    , Task.perform
        LoginFail LoginSuccess <|
        authenticate
            ("token" := Json.string)
            "/sessions"
            credentials
    )
{% endhighlight %}

Authenticate sends the credentials as a POST and extracts the token returned using the provided decoder. Http and token decoding errors are returned to the user as a LoginFail message. On `LoginSuccess` the token needs to be stored in the model.

I also generally use a `port` to save it in localstorage, and seek to load the token form local storage (together with a timestamp) when the page loads. Before using it, I can then check if it is still valid:

{% highlight haskell %}
LocalToken (time, token) ->
    case Jwt.isExpired time token of
        True ->
            -- send to login page
        False ->
            -- attach token to model and ue
{% endhighlight %}

## Making authenticated requests

Once the token is available, you can use it with the GET replacement function provided in the library, `Jwt.get`, which creates a custom GET request that attaches the token to the Http headers before sending. For example we might have this in `update`:

{% highlight haskell %}
TryToken ->
    ( { model | msg = "Attempting to load message..." }
    , (Jwt.get token dataDecoder "/api/data"
        `Task.onError` (promote401 token))
        |> Task.perform PostFail PostSucess
    )
{% endhighlight %}

Note the optional use of `promote401`, which is an additional convenience function that isolates Unauthorized responses from the server and checks whether these are causes by the token having expired. We could use this in our `update` function as:

{% highlight haskell %}
PostFail err ->
    case err of
        TokenExpired ->
            ( { model | msg = "Your token has expired" }, Cmd.none )
        _ ->
            ( { model | msg = toString err }, Cmd.none )
{% endhighlight %}

Back on the server side, we need to look for the token, load the user details associated with it, and add it to the connection. To start we add a new pipeline to our router.ex and apply it to all api requests.

{% highlight elixir %}
pipeline :api_auth do
    plug Guardian.Plug.VerifyHeader, realm: "Bearer"
    plug Guardian.Plug.LoadResource
end

scope "/api", JwtExample do
  pipe_through [ :api, :api_auth ]
  get "/data", DataController, :index
end
{% endhighlight %}

It is in the controller that we test that the user is in fact authenticated before deciding whether to provide a result. Guardian does that and has a helper to provide access to the user details, which I am passing to the view to use to customise the response.

{% highlight elixir %}
defmodule JwtExample.DataController do
  use JwtExample.Web, :controller

  # Check user authenticated, otherwise halt
  plug Guardian.Plug.EnsureAuthenticated, handler: __MODULE__

  def index(conn, _params) do
      user = Guardian.Plug.current_resource(conn)

      render(conn, "data.json", user: user)
  end
{% endhighlight %}

Jwt's are growing in popularity especially for single page apps. They can now be used easily and comfortably with your favourite functional client-server combination. Enjoy!
