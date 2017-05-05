---
title: Uploading to S3 from Elm
layout: post
tags: Elm
---

Storing binary data on S3 is a typical front-end need, and often has be implemented with authorisation to ensure that only designated users can upload. To do that, uploads need to be 'signed' with a secret key. There are several possible approaches:

 - Embed the secret key in the client software and calculate the signature client side. This is an obvious security risk, which can be mitigated by using a so-called IAM user in AWS that has the rights to upload files, but not to read any.

 - Require that the authorised users upload to our server, and then forward signed files from there to S3. That is obviously inefficient.

 - Have the client request a signature from the server, and let the client use that to upload directly to S3.

This blog focuses on the latter.

## Http - POST Form

The [Amazon docs](http://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-authentication-HTTPPOST.html) provide an example of an HTML form that - on Submit - POSTs to S3. In their case the server populates the form fields in advance with all the necessary credentials, and only the file to upload is required from the user. Notionally we could have Elm render the same HTML, and leave it to the browser to do the form submission, but that would clearly be bizarre.

A HTML webpage form ultimate creates a multi-part POST object, and Elm can be cajoled into doing the same. The trick is to use a new feature of [file-reader](https://github.com/simonh1000/file-reader) library. The library, which is available on Github only because it uses native code, provides access to the FileReader APIs, and includes a function `filePart` for making a `Http.Part` from a blob. Examples are included of the FileReader APIs, but this post builds on `filePart` to upload signed content to S3.

## Passing files to Elm

We have the choice of Drag-n-Drop and the HTML `<input type='file'>` tag, and the FileReader library provides Json Decoders to read the event objects that these generate. In the case of Drag-n-Drop, we get the file contents directly; while with the input tag we get a `File` object that is ready automatically by the `FormData` library used later. (As a result the FileReader apis are not needed in this instance.)

The following code snippet shows a simple Drag-n-Drop interface that keeps track of `dragenter` and `dragleave` events to provide users with visual feedback as they drag files onto the browser window. On `Drop`, we store the `NativeFiles` (see the FileReader library for details) in our Model.

{% highlight Haskell %}
update : Msg -> Model -> Model
update message model =
    case message of
        DragEnter ->
            { model | dnd = model.dnd + 1 }

        DragLeave ->
            { model | dnd = model.dnd - 1 }

        Drop nfs ->
            { model | dnd = 0, nativeFiles = nfs }

view : Model -> Html Msg
view {dnd } =
    div
        (class "drop-zone-container" :: dropZoneEventHandlers)
        [ if dnd == 0 then
            text ""
          else
            div [ class "drop-zone" ] [ text "Drop" ]
{% endhighlight %}

## Authorisation

To upload the files we will need authorisation in the form of signed credentials (a 'Policy' in S3 parlance). I will not cover the backend that uses a secret key to generate these, and in this instance, we will not encode any of the file details in the Policy. So we use a simple GET request to obtain credentials.

{% highlight Haskell %}
getSigningData : Cmd Msg
getSigningData =
    Http.get "/api/signature" (signatureDecoder SigningData)
        |> Http.send SigningDataResult

signatureDecoder constructor =
    map6 constructor
        (field "stem" string)
        (field "host" string)
        (field "credential" string)
        (field "date" string)
        (field "policy" string)
        (field "signature" string)
{% endhighlight %}

## Creating the POST form

With all the elements of the Policy in hand, we can now build the form to POST to S3. Most of the elements are `String`s that can be encoded with `Http.stringPart` but for the file content itself we need to rely on the FileReader library, for a little native code trick to get past the Elm compiler.

Looking at the source code we have:

{% highlight Haskell %}
filePart : String -> NativeFile -> Part
filePart name nf =
    Native.FileReader.filePart name nf.blob
{% endhighlight %}

where:

{% highlight Javascript %}
var filePart = function(name, blob) {
    return {
        _0: name,
        _1: blob
    }
};
{% endhighlight %}

With that we can use the following to complete the job.  `Http.multipartBody` will happily use the result of `FilePart` to add binary content to the native browser `FormData` object it is creating (`FormData` also reads a `File` loaded with the file input tag).

{% highlight Haskell %}
sendSignedData : Model -> Cmd Msg
sendSignedData { signingData, dropzone } =
    case dropzone.nativeFiles of
        [] ->
            Cmd.none

        nf :: _ ->
            Http.post bucket (makeMultiPart signingData nf) etagDecoder
                |> Http.send S3Confirmation


makeMultiPart : SigningData -> FR.NativeFile -> Http.Body
makeMultiPart signingData nf =
    multipartBody
        [ stringPart "key" (signingData.stem ++ "/" ++ nf.name)
        , stringPart "x-amz-algorithm" "AWS4-HMAC-SHA256"
        , stringPart "x-amz-credential" signingData.credential
        , stringPart "x-amz-date" signingData.date
        , stringPart "success_action_redirect" (signingData.host ++ "/success")
        , stringPart "policy" signingData.policy
        , stringPart "x-amz-signature" signingData.signature
        , FR.filePart "file" nf
        ]
{% endhighlight %}

Finally, we need to handle on the backend the GET `/success` when the upload succeeds. What I do is have that read the Url parameters (the Etag) and return them as json to Elm to complete the Command.

Full code on [Github](https://github.com/simonh1000/elm-s3-example), with Elixir backend.
